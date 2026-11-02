import { useEffect, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { CharacterProfile, SpriteAnimation } from '@mindcraft/sprites'
import { trpc } from '../lib/api/trpc.ts'
import { colors } from '../lib/theme.ts'
import { AcademicNPC } from '../components/AcademicNPC.tsx'
import { Body, Button, Card, Field, Title } from '../components/ui.tsx'

export function MentorRoomScreen({
  characterId,
  courseId,
  onStartQuest,
  onEditTeacher,
}: {
  characterId: string
  courseId?: string
  onStartQuest: (courseId?: string, topic?: string) => void
  onEditTeacher?: (courseId: string) => void
}) {
  const [teacher, setTeacher] = useState<CharacterProfile | null>(null)
  const [message, setMessage] = useState('')
  const [log, setLog] = useState<Array<{ from: 'you' | 'mentor'; text: string }>>([])
  const [anim, setAnim] = useState<SpriteAnimation>('idle')
  const [socraticHint, setSocraticHint] = useState<string | undefined>()
  const [suggestedTopic, setSuggestedTopic] = useState<string | undefined>()
  const [memorySummary, setMemorySummary] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all([
      trpc().characters.status.query({ id: characterId }),
      trpc().mentors.history.query({ characterId }),
    ])
      .then(([row, hist]) => {
        if (row?.profile) {
          setTeacher(row.profile)
        }
        if (hist.turns.length > 0) {
          setLog(
            hist.turns.map((t) => ({
              from: t.role === 'user' ? 'you' : 'mentor',
              text: t.text,
            }))
          )
        } else if (row?.profile.welcomeMessage) {
          setLog([{ from: 'mentor', text: row.profile.welcomeMessage }])
        }
        setMemorySummary(hist.summary)
      })
      .catch(() => undefined)
  }, [characterId])

  async function send() {
    if (!message.trim()) return
    const text = message.trim()
    setMessage('')
    setLog((prev) => [...prev, { from: 'you', text }])
    setBusy(true)
    try {
      const reply = await trpc().mentors.chat.mutate({ characterId, message: text })
      setAnim(reply.animation)
      setSocraticHint(reply.socraticHint)
      setLog((prev) => [...prev, { from: 'mentor', text: reply.message }])
      if (reply.nextAction === 'start_quest') {
        setSuggestedTopic(reply.learningObjective || text)
      }
    } catch (error) {
      Alert.alert('Sohbet', error instanceof Error ? error.message : 'Bir sorun oluştu')
    } finally {
      setBusy(false)
    }
  }

  return (
    <SafeAreaView style={styles.box}>
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Title>{teacher?.name ?? 'Öğretmen Odası'}</Title>
          <Body>{teacher?.title ? `${teacher.title} · Durum: ${anim}` : `Durum: ${anim}`}</Body>
        </View>
        {courseId && onEditTeacher ? (
          <Pressable onPress={() => onEditTeacher(courseId)} style={styles.editBadge}>
            <Text style={styles.editBadgeText}>Hocayı Düzenle</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.spriteStage}>
        <AcademicNPC appearance={teacher?.appearance} animation={anim} size={136} />
        {teacher?.catchphrase ? (
          <Text style={styles.catchphrase}>"{teacher.catchphrase}"</Text>
        ) : null}
        {memorySummary ? <Text style={styles.memoryText}>Hafıza: {memorySummary}</Text> : null}
      </View>

      {socraticHint ? (
        <View style={styles.hintBanner}>
          <Text style={styles.hintText}>💡 Sokratik İpucu: {socraticHint}</Text>
        </View>
      ) : null}

      <ScrollView style={styles.log} contentContainerStyle={{ gap: 10, paddingVertical: 8 }}>
        {log.map((row, i) => (
          <View key={i} style={[styles.bubble, row.from === 'you' ? styles.youBubble : styles.mentorBubble]}>
            <Text style={row.from === 'you' ? styles.you : styles.mentor}>{row.text}</Text>
          </View>
        ))}

        {suggestedTopic ? (
          <Card>
            <Text style={styles.questInviteTitle}>🎯 Öğretmen Görev Önerisi</Text>
            <Body>Konu: {suggestedTopic}</Body>
            <Button
              label="Önerilen Görevi Başlat"
              onPress={() => onStartQuest(courseId, suggestedTopic)}
            />
          </Card>
        ) : null}
      </ScrollView>

      <Field placeholder="Sor veya bir hipotez yaz" value={message} onChangeText={setMessage} />
      <Button disabled={busy} label={busy ? 'Düşünüyor…' : 'Gönder'} onPress={send} />
      <Button
        ghost
        label="Bu Derste Maceraya Başla"
        onPress={() => onStartQuest(courseId, suggestedTopic || teacher?.title || 'Günün Konusu')}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  box: { flex: 1, backgroundColor: colors.bg, padding: 22, gap: 10 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  editBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editBadgeText: { color: '#01d4ff', fontWeight: '700', fontSize: 12 },
  spriteStage: {
    borderRadius: 24,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
  },
  catchphrase: {
    color: colors.muted,
    fontStyle: 'italic',
    fontSize: 12,
    textAlign: 'center',
  },
  memoryText: {
    color: '#01d4ff',
    fontSize: 11,
    textAlign: 'center',
  },
  hintBanner: {
    backgroundColor: '#13072e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#01d4ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  hintText: { color: colors.text, fontSize: 12 },
  questInviteTitle: { color: '#01d4ff', fontWeight: '800', fontSize: 15 },
  log: { flex: 1 },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    maxWidth: '88%',
  },
  youBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#2a1650',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  mentorBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  you: { color: colors.text },
  mentor: { color: colors.text, lineHeight: 20 },
})
