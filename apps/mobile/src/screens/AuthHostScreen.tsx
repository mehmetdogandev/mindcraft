import { useState } from 'react'
import { Alert, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { signIn, signUp } from '../lib/auth/session.ts'
import { colors } from '../lib/theme.ts'
import { BrandMark } from '../components/BrandMark.tsx'
import { Body, Button, Field } from '../components/ui.tsx'

export function AuthHostScreen({ onReady }: { onReady: () => void }) {
  const [mode, setMode] = useState<'in' | 'up'>('up')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    try {
      if (mode === 'up') await signUp(name || 'Oyuncu', email.trim(), password)
      else await signIn(email.trim(), password)
      onReady()
    } catch (error) {
      Alert.alert('Olmadı', error instanceof Error ? error.message : 'Bilinmeyen hata')
    } finally {
      setBusy(false)
    }
  }

  return (
    <SafeAreaView style={styles.box}>
      <BrandMark />
      <Body>Tüm hesap, ders, öğretmen ve ilerleme verilerin doğrudan cihazında (yerel veritabanında) tutulur.</Body>
      {mode === 'up' ? <Field placeholder="Adın" value={name} onChangeText={setName} /> : null}
      <Field
        placeholder="E-posta"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <Field placeholder="Şifre" secureTextEntry value={password} onChangeText={setPassword} />
      <Button disabled={busy || !email || !password} label={mode === 'up' ? 'Kayıt ol ve Başla' : 'Giriş yap'} onPress={submit} />
      <View>
        <Button
          ghost
          label={mode === 'up' ? 'Zaten hesabım var' : 'Yeni hesap oluştur'}
          onPress={() => setMode(mode === 'up' ? 'in' : 'up')}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  box: { flex: 1, backgroundColor: colors.bg, padding: 22, gap: 14, justifyContent: 'center' },
})
