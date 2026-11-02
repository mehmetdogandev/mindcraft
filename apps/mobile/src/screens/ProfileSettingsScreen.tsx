import { useCallback, useEffect, useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { normalizeNpcAppearance, type NpcAppearance } from '@mindcraft/sprites'
import { trpc } from '../lib/api/trpc.ts'
import { signOut } from '../lib/auth/session.ts'
import { colors } from '../lib/theme.ts'
import { ConversationalCharacterCreator } from '../components/ConversationalCharacterCreator.tsx'
import { Body, Button, Card, Field, Title } from '../components/ui.tsx'

export function ProfileSettingsScreen({
  onSignedOut,
}: {
  onSignedOut: () => void
}) {
  const [displayName, setDisplayName] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [department, setDepartment] = useState('')
  const [learningStyle, setLearningStyle] = useState('')
  const [goals, setGoals] = useState('')

  const [avatarPrompt, setAvatarPrompt] = useState('')
  const [avatarAppearance, setAvatarAppearance] = useState<NpcAppearance>(
    normalizeNpcAppearance({}, 'öğrenci')
  )

  const [geminiKey, setGeminiKey] = useState('')
  const [maskedKey, setMaskedKey] = useState('')
  const [geminiConfigured, setGeminiConfigured] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const [profileData, keyData] = await Promise.all([
      trpc().profile.get.query(),
      trpc().profile.geminiKey.get.query(),
    ])
    setDisplayName(profileData.profile.displayName ?? profileData.user.name ?? '')
    setSchoolName(profileData.student?.schoolName ?? '')
    setDepartment(profileData.student?.department ?? '')
    setLearningStyle(profileData.profile.learningStyle ?? '')
    setGoals(profileData.profile.goals ?? '')
    if (profileData.avatar?.profile.appearance) {
      setAvatarAppearance(normalizeNpcAppearance(profileData.avatar.profile.appearance))
    }
    setMaskedKey(keyData.maskedKey)
    setGeminiConfigured(keyData.configured)
  }, [])

  useEffect(() => {
    load().catch(() => undefined)
  }, [load])

  async function saveProfileAndAvatar() {
    setBusy(true)
    try {
      await trpc().profile.update.mutate({
        displayName: displayName.trim(),
        schoolName: schoolName.trim(),
        department: department.trim(),
        learningStyle: learningStyle.trim(),
        goals: goals.trim(),
      })
      await trpc().characters.create.mutate({
        kind: 'avatar',
        method: 'describe',
        prompt: avatarPrompt.trim() || displayName.trim() || 'Oyuncu',
        appearance: avatarAppearance,
      })
      Alert.alert('Kaydedildi', 'Profilin ve oyuncu karakterin güncellendi.')
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Kaydedilemedi')
    } finally {
      setBusy(false)
    }
  }

  async function saveKey() {
    await trpc().profile.geminiKey.set.mutate({ apiKey: geminiKey.trim() || null })
    setGeminiKey('')
    await load()
    Alert.alert(
      'AI Yapılandırması',
      geminiKey.trim()
        ? 'Gemini API anahtarı cihazına kaydedildi.'
        : 'Kayıtlı Gemini anahtarı temizlendi; yerel AI motoru aktif.'
    )
  }

  return (
    <SafeAreaView style={styles.box}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Title>Profil ve Karakter</Title>

        <Card>
          <ConversationalCharacterCreator
            title={displayName ? `${displayName} — AI Karakter Tasarımı` : 'Oyuncu Karakter Stüdyosu'}
            initialPrompt={avatarPrompt}
            appearance={avatarAppearance}
            onChange={({ appearance, lastPrompt }) => {
              setAvatarAppearance(appearance)
              if (lastPrompt) setAvatarPrompt(lastPrompt)
            }}
            onSaveCharacter={saveProfileAndAvatar}
            saveLabel="Karakteri Kaydet"
            saving={busy}
          />
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Akademik Kimlik</Text>
          <Field placeholder="Adın" value={displayName} onChangeText={setDisplayName} />
          <Field placeholder="Okul / Üniversite" value={schoolName} onChangeText={setSchoolName} />
          <Field placeholder="Bölüm" value={department} onChangeText={setDepartment} />
          <Field
            placeholder="Öğrenme stili (örn: Görsel ve pratik örneklerle)"
            value={learningStyle}
            onChangeText={setLearningStyle}
          />
          <Field placeholder="Hedeflerin" value={goals} onChangeText={setGoals} />
          <Button
            disabled={busy}
            label={busy ? 'Kaydediliyor…' : 'Profili ve Karakteri Kaydet'}
            onPress={saveProfileAndAvatar}
          />
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Cihaz İçi Gemini AI Ayarı (Opsiyonel)</Text>
          <Body>
            Durum:{' '}
            {geminiConfigured
              ? `Gemini aktif ${maskedKey ? `(${maskedKey})` : '(env üzerinden)'}`
              : 'Yerel akıllı mod aktif (API anahtarı olmadan da tüm karakter ve oyun motoru çalışır)'}
          </Body>
          <Field
            placeholder="AIza... (Yeni Gemini API Key gir veya boş bırakıp temizle)"
            value={geminiKey}
            onChangeText={setGeminiKey}
            autoCapitalize="none"
          />
          <Button ghost label="API Anahtarını Güncelle" onPress={saveKey} />
        </Card>

        <Button
          ghost
          label="Oturumu Kapat"
          onPress={async () => {
            await signOut()
            onSignedOut()
          }}
        />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  box: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 22, gap: 14, paddingBottom: 40 },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
})
