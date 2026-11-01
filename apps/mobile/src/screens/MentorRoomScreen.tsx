import { useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { trpc } from '../lib/api/trpc.ts'
import { colors } from '../lib/theme.ts'
import { Body, Button, Field, Title } from '../components/ui.tsx'

export function MentorRoomScreen({
  characterId,
  courseId,
  onStartQuest,
}: {
  characterId: string
  courseId?: string
  onStartQuest: (courseId?: string, topic?: string) => void
}) {
  const [message, setMessage] = useState('')
  const [log, setLog] = useState<Array<{ from: 'you' | 'mentor'; text: string }>>([])
  const [anim, setAnim] = useState('idle')
  const [busy, setBusy] = useState(false)

  async function send() {
    if (!message.trim()) return
    const text = message.trim()
    setMessage('')
    setLog((prev) => [...prev, { from: 'you', text }])
    setBusy(true)
    try {
      const reply = await trpc().mentors.chat.mutate({ characterId, message: text })
      setAnim(reply.animation)
      setLog((prev) => [...prev, { from: 'mentor', text: reply.message }])
      if (reply.nextAction === 'start_quest') {
        onStartQuest(courseId, reply.learningObjective || text)
      }
    } catch (error) {
      Alert.alert('Sohbet', error instanceof Error ? error.message : 'AI kapalı')
    } finally {
      setBusy(false)
    }
  }

  return (
    <SafeAreaView style={styles.box}>
      <Title>Öğretmen odası</Title>
      <Body>Animasyon: {anim}</Body>
      <View style={styles.sprite}>
        <Text style={styles.spriteFace}>{anim === 'think' ? '◉‿◉' : anim === 'celebrate' ? '\\(^_^)/' : '( •‿• )'}</Text>
      </View>
      <ScrollView style={styles.log} contentContainerStyle={{ gap: 8 }}>
        {log.map((row, i) => (
          <Text key={i} style={row.from === 'you' ? styles.you : styles.mentor}>
            {row.text}
          </Text>
        ))}
      </ScrollView>
      <Field placeholder="Sor veya bir hipotez yaz" value={message} onChangeText={setMessage} />
      <Button disabled={busy} label={busy ? 'Düşünüyor…' : 'Gönder'} onPress={send} />
      <Button label="Maceraya başla" onPress={() => onStartQuest(courseId, 'bugünün konusu')} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  box: { flex: 1, backgroundColor: colors.bg, padding: 22, gap: 10 },
  sprite: {
    height: 140,
    borderRadius: 24,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spriteFace: { color: colors.text, fontSize: 32 },
  log: { flex: 1 },
  you: { color: colors.accent, textAlign: 'right' },
  mentor: { color: colors.text },
})
