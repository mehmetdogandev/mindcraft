import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'mindcraft.bearer'

export async function getToken() {
  return AsyncStorage.getItem(KEY)
}

export async function setToken(token: string | null) {
  if (!token) {
    await AsyncStorage.removeItem(KEY)
    return
  }
  await AsyncStorage.setItem(KEY, token)
}
