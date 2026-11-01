import { API_BASE_URL } from '../config.ts'
import { setToken } from './storage.ts'

async function parseAuth(res: Response) {
  const token = res.headers.get('set-auth-token')
  if (token) await setToken(token)
  const json = (await res.json()) as { user?: { id: string; email: string; name: string }; error?: { message?: string } }
  if (!res.ok) {
    throw new Error(json.error?.message ?? 'Giriş başarısız')
  }
  return json.user
}

export async function signIn(email: string, password: string) {
  const res = await fetch(`${API_BASE_URL}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return parseAuth(res)
}

export async function signUp(name: string, email: string, password: string) {
  const res = await fetch(`${API_BASE_URL}/api/auth/sign-up/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  })
  return parseAuth(res)
}

export async function signOut() {
  await setToken(null)
}
