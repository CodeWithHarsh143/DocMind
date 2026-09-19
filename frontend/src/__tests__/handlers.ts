import { http, HttpResponse } from 'msw'

const API = 'http://localhost'

let tokenVersion = 0

export const handlers = [
  http.post(`${API}/auth/login`, async ({ request }) => {
    const body = await request.text()
    const params = new URLSearchParams(body)
    const username = params.get('username')
    const password = params.get('password')

    if (!username || !password) {
      return HttpResponse.json({ detail: 'Incorrect email or password' }, { status: 401 })
    }

    if (username === 'bad@example.com') {
      return HttpResponse.json({ detail: 'Incorrect email or password' }, { status: 401 })
    }

    tokenVersion++
    return HttpResponse.json({
      access_token: `access-${tokenVersion}`,
      refresh_token: `refresh-${tokenVersion}`,
      token_type: 'bearer',
    })
  }),

  http.post(`${API}/auth/register`, async ({ request }) => {
    const { email } = (await request.json()) as { email: string; password: string }

    if (email === 'existing@example.com') {
      return HttpResponse.json({ detail: 'Email already registered' }, { status: 409 })
    }

    return HttpResponse.json({
      id: 1,
      email,
      created_at: new Date().toISOString(),
    })
  }),

  http.get(`${API}/auth/me`, ({ request }) => {
    const auth = request.headers.get('Authorization')
    if (!auth || !auth.startsWith('Bearer ')) {
      return HttpResponse.json({ detail: 'Not authenticated' }, { status: 401 })
    }

    return HttpResponse.json({
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      phone: '+15550102030',
      avatar_url: null,
      created_at: '2024-01-15T00:00:00Z',
    })
  }),

  http.post(`${API}/auth/logout`, () => {
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(`${API}/auth/google`, async ({ request }) => {
    const { id_token } = (await request.json()) as { id_token: string }

    if (id_token === 'invalid-token') {
      return HttpResponse.json({ detail: 'Invalid Google token' }, { status: 401 })
    }

    tokenVersion++
    return HttpResponse.json({
      access_token: `google-access-${tokenVersion}`,
      refresh_token: `google-refresh-${tokenVersion}`,
      token_type: 'bearer',
    })
  }),

  http.post(`${API}/auth/request-otp`, async ({ request }) => {
    const { identifier } = (await request.json()) as { identifier: string }
    if (!identifier) {
      return HttpResponse.json({ detail: 'Identifier is required' }, { status: 422 })
    }
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(`${API}/auth/verify-otp`, async ({ request }) => {
    const { code } = (await request.json()) as { identifier: string; code: string }
    if (code === '000000') {
      return HttpResponse.json({ detail: 'Invalid OTP.' }, { status: 401 })
    }
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(`${API}/auth/reset-password`, async ({ request }) => {
    const body = (await request.json()) as { identifier: string; code: string; new_password: string }
    if (body.new_password === 'weak') {
      return HttpResponse.json({ detail: 'Password is too weak' }, { status: 422 })
    }
    return new HttpResponse(null, { status: 204 })
  }),

  http.get(`${API}/organizations/mine`, () => {
    return HttpResponse.json([
      {
        id: 1,
        name: 'Acme Corp',
        description: 'Test org',
        logo_url: null,
        created_at: '2024-01-10T00:00:00Z',
        members: [
          { id: 1, user_id: 1, organization_id: 1, role: 'admin' },
        ],
      },
    ])
  }),

  http.get(`${API}/organizations/:id/members`, ({ params }) => {
    const orgId = params.id
    return HttpResponse.json([
      {
        id: 1,
        user_id: 1,
        organization_id: Number(orgId),
        role: 'admin',
        email: 'test@example.com',
        name: 'Test User',
        avatar_url: null,
        joined_at: '2024-01-15T00:00:00Z',
        status: 'active',
      },
      {
        id: 2,
        user_id: 2,
        organization_id: Number(orgId),
        role: 'user',
        email: 'jane@example.com',
        name: 'Jane Doe',
        avatar_url: null,
        joined_at: '2024-02-20T00:00:00Z',
        status: 'active',
      },
    ])
  }),

  http.post(`${API}/organizations/:id/members`, async ({ params, request }) => {
    const orgId = Number(params.id)
    const { email, role } = (await request.json()) as { email: string; role: string }

    if (email === 'jane@example.com') {
      return HttpResponse.json({ detail: 'That email is already a member of this organization.' }, { status: 409 })
    }

    return HttpResponse.json({
      id: 3,
      user_id: 3,
      organization_id: orgId,
      role,
      email,
      name: null,
      avatar_url: null,
      joined_at: null,
      status: 'pending',
    })
  }),

  http.patch(`${API}/organizations/:orgId/members/:userId`, async ({ request }) => {
    const orgId = Number(request.url.split('/organizations/')[1]?.split('/')[0])
    const body = (await request.json()) as { role: string }
    return HttpResponse.json({
      id: 2,
      user_id: 2,
      organization_id: orgId,
      role: body.role,
      email: 'jane@example.com',
      name: 'Jane Doe',
      avatar_url: null,
      joined_at: '2024-02-20T00:00:00Z',
      status: 'active',
    })
  }),

  http.delete(`${API}/organizations/:orgId/members/:userId`, () => {
    return new HttpResponse(null, { status: 204 })
  }),

  http.patch(`${API}/organizations/:id`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json({
      id: Number(request.url.split('/organizations/')[1]),
      name: body.name ?? 'Acme Corp',
      description: body.description ?? null,
      logo_url: body.logo_url ?? null,
      created_at: '2024-01-10T00:00:00Z',
    })
  }),

  http.post(`${API}/organizations/:id/logo`, () => {
    return HttpResponse.json({ logo_url: '/uploads/logos/new-logo.png' })
  }),

  http.patch(`${API}/users/me/profile`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>
    return HttpResponse.json({
      id: 1,
      email: 'test@example.com',
      name: body.name ?? 'Test User',
      phone: body.phone ?? null,
      avatar_url: body.avatar_url ?? null,
      created_at: '2024-01-15T00:00:00Z',
    })
  }),

  http.post(`${API}/users/me/avatar`, () => {
    return HttpResponse.json({ avatar_url: '/uploads/avatars/new-avatar.png' })
  }),
]
