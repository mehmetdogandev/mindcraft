import { useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { validateEnergyMatrix } from '@mindcraft/game-rules'
import { trpc } from '../lib/api/trpc.ts'
import { colors } from '../lib/theme.ts'
import { Body, Button, Field, Title } from '../components/ui.tsx'

type Quest = {
  id: string
  type: string
  title: string
  payload: Record<string, unknown>
}

export function QuestScreen({
  courseId,
  topic,
  onDone,
}: {
  courseId?: string
  topic?: string
  onDone: () => void
}) {
  const [quest, setQuest] = useState<Quest | null>(null)
  const [activeIds, setActiveIds] = useState<string[]>([])
  const [instructions, setInstructions] = useState('')
  const [choice, setChoice] = useState('')
  const [explanation, setExplanation] = useState('')
  const [busy, setBusy] = useState(false)

  async function generate() {
    setBusy(true)
    try {
      const created = await trpc().quests.generate.mutate({
        courseId,
        topic: topic || 'bağlı listeler',
        difficulty: 'Orta',
      })
      setQuest({
        id: created.id,
        type: created.type,
        title: created.title,
        payload: created.payload as Record<string, unknown>,
      })
      const nodes = (created.payload as { nodes?: Array<{ id: string }> }).nodes ?? []
      setActiveIds(nodes.map((n) => n.id).slice(0, 2))
    } catch (error) {
      Alert.alert('Görev', error instanceof Error ? error.message : 'Üretilemedi')
    } finally {
      setBusy(false)
    }
  }

  async function submit() {
    if (!quest) return
    setBusy(true)
    try {
      let answer: unknown = { explanation }
      if (quest.type === 'matrix') answer = { activeIds }
      if (quest.type === 'algorithm') {
        answer = {
          instructions: instructions
            .split(/[,\s]+/)
            .map((s) => s.trim().toUpperCase())
            .filter(Boolean),
        }
      }
      if (quest.type === 'dilemma') answer = { choiceId: choice }
      const result = await trpc().quests.submit.mutate({
        questId: quest.id,
        answer,
        explanation,
        attemptsUsed: 1,
        hintsUsed: 0,
      })
      Alert.alert(result.isCorrect ? 'İlerledin' : 'Deneme değerli', `+${result.xpAwarded} XP`)
      onDone()
    } catch (error) {
      Alert.alert('Teslim', error instanceof Error ? error.message : 'Kayıt olmadı')
    } finally {
      setBusy(false)
    }
  }

  const nodes = ((quest?.payload.nodes as Array<{ id: string; label: string; value: number }>) ?? [])
  const live = quest?.type === 'matrix' ? validateEnergyMatrix(
    nodes.map((n) => ({ ...n, active: activeIds.includes(n.id) })),
    Number(quest.payload.targetValue)
  ) : null

  return (
    <SafeAreaView style={styles.box}>
      <Title>{quest?.title ?? 'Macera'}</Title>
      {!quest ? <Button disabled={busy} label="Görev üret" onPress={generate} /> : null}
      {quest?.type === 'matrix' ? (
        <>
          <Body>Hedef: {String(quest.payload.targetValue)} · şu an {live?.currentSum}</Body>
          {nodes.map((n) => (
            <Pressable
              key={n.id}
              onPress={() =>
                setActiveIds((ids) => (ids.includes(n.id) ? ids.filter((id) => id !== n.id) : [...ids, n.id]))
              }
              style={[styles.node, activeIds.includes(n.id) && styles.nodeOn]}
            >
              <Text style={styles.nodeText}>
                {n.label} ({n.value})
              </Text>
            </Pressable>
          ))}
        </>
      ) : null}
      {quest?.type === 'algorithm' ? (
        <>
          <Body>MOVE, TURN_LEFT, TURN_RIGHT komutlarını yaz.</Body>
          <Field placeholder="MOVE TURN_RIGHT MOVE" value={instructions} onChangeText={setInstructions} />
        </>
      ) : null}
      {quest?.type === 'dilemma' ? (
        <>
          <Body>{String(quest.payload.scenario ?? '')}</Body>
          {((quest.payload.choices as Array<{ id: string; label: string }>) ?? []).map((c) => (
            <Button key={c.id} label={c.label} onPress={() => setChoice(c.id)} />
          ))}
        </>
      ) : null}
      {quest ? (
        <>
          <Field placeholder="Neden böyle düşündün?" value={explanation} onChangeText={setExplanation} />
          <Button disabled={busy} label="Teslim et" onPress={submit} />
        </>
      ) : null}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  box: { flex: 1, backgroundColor: colors.bg, padding: 22, gap: 10 },
  node: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  nodeOn: { backgroundColor: '#2a1650', borderColor: colors.accent },
  nodeText: { color: colors.text },
})
