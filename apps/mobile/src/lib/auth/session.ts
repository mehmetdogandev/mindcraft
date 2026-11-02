import { localSignIn, localSignUp } from '../../backend/router.ts'
import { setToken } from './storage.ts'

export async function signIn(email: string, password: string) {
  return localSignIn(email, password)
}

export async function signUp(name: string, email: string, password: string) {
  return localSignUp(name, email, password)
}

export async function signOut() {
  await setToken(null)
}
