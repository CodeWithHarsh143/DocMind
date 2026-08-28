import { useCallback, useEffect, useRef, useState } from 'react'
import { listDocuments } from '../lib/documents'
import type { DocumentRecord } from '../types'

const PENDING_STATES = new Set(['pending', 'processing'])

/**
 * Loads documents for an organization and polls while any document is still
 * being processed, keeping statuses live without manual refreshes.
 */
export function useDocuments(orgId: number | null, pollIntervalMs = 3000) {
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingOrg, setLoadingOrg] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const orgRef = useRef<string | null>(null)

  const refresh = useCallback(async () => {
    if (orgId == null) {
      setDocuments([])
      setLoading(false)
      return
    }
    const key = `${orgId}:${Date.now()}`
    orgRef.current = key
    try {
      const docs = await listDocuments(orgId)
      if (orgRef.current !== key) return
      setDocuments(docs)
      setError(null)
    } catch (err) {
      if (orgRef.current !== key) return
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      if (orgRef.current === key) setLoading(false)
    }
  }, [orgId])

  useEffect(() => {
    orgRef.current = null
    // Reset the list whenever the organization changes (intentional sync pattern).
    // oxlint-disable-next-line react/set-state-in-effect
    setDocuments([])
    setLoading(true)
    setError(null)
    if (orgId != null) {
      setLoadingOrg(true)
      void refresh().finally(() => setLoadingOrg(false))
    } else {
      setLoading(false)
    }
  }, [orgId, refresh])

  const anyProcessing = documents.some((d) => PENDING_STATES.has(d.processing_status))

  useEffect(() => {
    if (!orgId || !anyProcessing) return
    const id = window.setInterval(() => {
      void refresh()
    }, pollIntervalMs)
    return () => window.clearInterval(id)
  }, [orgId, anyProcessing, pollIntervalMs, refresh])

  return { documents, loading, loadingOrg, error, refresh }
}