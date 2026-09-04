import { useCallback, useEffect, useState } from "react";
import type { OrganizationRole } from "../types";
import * as membersApi from "../lib/orgMembers";
import type { InviteInput, OrgMember } from "../lib/orgMembers";

/**
 * Loads and mutates the member roster for an org through the backend API.
 */
export function useOrgMembers(orgId: number | null) {
    const [members, setMembers] = useState<OrgMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const refresh = useCallback(async () => {
        const id = orgId;
        if (id == null) return;
        setLoading(true);
        setError(null);
        try {
            const list = await membersApi.listOrgMembers(id);
            setMembers(list);
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setLoading(false);
        }
    }, [orgId]);

    useEffect(() => {
        // oxlint-disable-next-line react/set-state-in-effect
        setMembers([]);
        setError(null);
        void refresh();
    }, [refresh]);

    const addMember = useCallback(
        async (input: InviteInput): Promise<void> => {
            if (orgId == null) throw new Error("Missing organization context.");
            const member = await membersApi.inviteToOrg(orgId, input);
            setMembers((prev) => [...prev, member]);
        },
        [orgId],
    );

    const setRole = useCallback(
        async (userId: number, role: OrganizationRole): Promise<void> => {
            if (!orgId) return;
            const updated = await membersApi.setOrgMemberRole(
                orgId,
                userId,
                role,
            );
            setMembers((prev) =>
                prev.map((m) => (m.user_id === userId ? updated : m)),
            );
        },
        [orgId],
    );

    const removeMember = useCallback(
        async (userId: number): Promise<void> => {
            if (!orgId) return;
            await membersApi.removeOrgMember(orgId, userId);
            setMembers((prev) => prev.filter((m) => m.user_id !== userId));
        },
        [orgId],
    );

    return {
        members,
        loading,
        error,
        refresh,
        addMember,
        setRole,
        removeMember,
    };
}
