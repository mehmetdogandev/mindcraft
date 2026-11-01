import { API_BASE_URL } from '../config.ts'
import { setToken } from './storage.ts'

async function parseAuth(res: Response) {
  const token = res.headers.get('set-auth-token')
  if (token) await setToken(token)
  const raw = await res.text()
  let json: { user?: { id: string; email: string; name: string }; message?: string; error?: { message?: string } } = {}
  try {
    json = raw ? (JSON.parse(raw) as typeof json) : {}
  } catch {
    throw new Error(res.ok ? 'Sunucu yanıtı okunamadı' : `Sunucu ${res.status} verdi. Tablolar yoksa kökte pnpm db:push çalıştır.`)
  }
  if (!res.ok) {
    throw new Error(json.error?.message ?? json.message ?? `Kayıt/giriş olmadı (${res.status})`)
  }
  return json.user
}

async function postAuth(path: string, body: Record<string, string>) {
  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      credentials: 'omit',
      headers: {
        'content-type': 'application/json',
        origin: API_BASE_URL,
      },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error(`API’ye ulaşılamadı: ${API_BASE_URL}. Simülatörde localhost, gerçek telefonda Mac’in LAN IP’si gerekir.`)
  }
}

export async function signIn(email: string, password: string) {
  return parseAuth(await postAuth('/api/auth/sign-in/email', { email, password }))
}

export async function signUp(name: string, email: string, password: string) {
  return parseAuth(await postAuth('/api/auth/sign-up/email', { name, email, password }))
}

export async function signOut() {
  await setToken(null)
}
