import { useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { runAlgorithmSequence, validateEnergyMatrix, type SkillScores } from '@mindcraft/game-rules'
import { trpc } from '../lib/api/trpc.ts'
import { colors } from '../lib/theme.ts'
import { Body, Button, Card, Field, Title } from '../components/ui.tsx'

type CommandType = 'MOVE' | 'TURN_LEFT' | 'TURN_RIGHT'

type Quest = {
  id: string
  type: 'matrix' | 'algorithm' | 'dilemma'
  title: string
  payload: Record<string, unknown>
}

type SubmitSummary = {
  isCorrect: boolean
  xpAwarded: number
  totalXp: number
  level: { level: number; currentLevelXP: number; nextLevelXP: number; title: string }
  evaluation: {
    score: number
    critique: string
    praise: string
    nextConcept: string
  }
  skills: SkillScores
}

const DIR_ARROWS: Record<string, string> = {
  N: '↑',
  E: '→',
  S: '↓',
  W: '←',
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
  const [wantedType, setWantedType] = useState<'matrix' | 'algorithm' | 'dilemma' | undefined>()
  const [activeIds, setActiveIds] = useState<string[]>([])
  const [commands, setCommands] = useState<CommandType[]>([])
  const [choice, setChoice] = useState('')
  const [explanation, setExplanation] = useState('')
  const [attempts, setAttempts] = useState(1)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [summary, setSummary] = useState<SubmitSummary | null>(null)
  const [busy, setBusy] = useState(false)

  async function generate(typeOverride?: 'matrix' | 'algorithm' | 'dilemma') {
    setBusy(true)
    try {
      const created = await trpc().quests.generate.mutate({
        courseId,
        topic: topic || 'Veri Yapıları ve Mantık',
        difficulty: 'Orta',
        type: typeOverride ?? wantedType,
      })
      setQuest({
        id: created.id,
        type: created.type,
        title: created.title,
        payload: created.payload as Record<string, unknown>,
      })
      setActiveIds([])
      setCommands([])
      setChoice('')
      setExplanation('')
      setAttempts(1)
      setHintsUsed(0)
      setSummary(null)
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
      if (quest.type === 'algorithm') answer = { instructions: commands }
      if (quest.type === 'dilemma') answer = { choiceId: choice }

      const result = await trpc().quests.submit.mutate({
        questId: quest.id,
        answer,
        explanation,
        attemptsUsed: attempts,
        hintsUsed,
      })
      setSummary({
        isCorrect: result.isCorrect,
        xpAwarded: result.xpAwarded,
        totalXp: result.totalXp,
        level: result.level,
        evaluation: result.evaluation,
        skills: result.skills,
      })
    } catch (error) {
      setAttempts((a) => a + 1)
      Alert.alert('Teslim', error instanceof Error ? error.message : 'Kayıt olmadı')
    } finally {
      setBusy(false)
    }
  }

  const hints = (quest?.payload.hints as string[]) ?? [
    'Problemi küçük adımlara bölerek ilerle.',
    'Açıklama alanına düşünce sürecini yazmak ekstra XP kazandırır.',
  ]

  const nodes = (quest?.payload.nodes as Array<{ id: string; label: string; value: number }>) ?? []
  const liveMatrix =
    quest?.type === 'matrix'
      ? validateEnergyMatrix(
          nodes.map((n) => ({ ...n, active: activeIds.includes(n.id) })),
          Number(quest.payload.targetValue)
        )
      : null

  const gridWidth = Number(quest?.payload.gridWidth ?? 4)
  const gridHeight = Number(quest?.payload.gridHeight ?? 4)
  const startPos = (quest?.payload.start as { x: number; y: number; dir: 'N' | 'E' | 'S' | 'W' }) ?? {
    x: 0,
    y: gridHeight - 1,
    dir: 'E',
  }
  const targetPos = (quest?.payload.target as { x: number; y: number }) ?? { x: gridWidth - 1, y: 0 }
  const obstacles = (quest?.payload.obstacles as Array<{ x: number; y: number }>) ?? []
  const liveAlgo =
    quest?.type === 'algorithm'
      ? runAlgorithmSequence({ width: gridWidth, height: gridHeight }, startPos, commands, obstacles, targetPos)
      : null

  if (summary) {
    return (
      <SafeAreaView style={styles.box}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Title>{summary.isCorrect ? 'Görev Tamamlandı!' : 'Değerli Bir Deneme!'}</Title>
          <Card>
            <Text style={styles.xpBadge}>+{summary.xpAwarded} XP Kazandın</Text>
            <Body>
              {summary.level.title} · Seviye {summary.level.level} ({summary.level.currentLevelXP} /{' '}
              {summary.level.nextLevelXP} XP)
            </Body>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(
                      100,
                      Math.round((summary.level.currentLevelXP / summary.level.nextLevelXP) * 100)
                    )}%`,
                  },
                ]}
              />
            </View>
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Öğretmen Değerlendirmesi</Text>
            {summary.evaluation.praise ? <Body>★ {summary.evaluation.praise}</Body> : null}
            {summary.evaluation.critique ? <Body>• {summary.evaluation.critique}</Body> : null}
            {summary.evaluation.nextConcept ? (
              <Text style={styles.statusText}>Sıradaki Kavram: {summary.evaluation.nextConcept}</Text>
            ) : null}
          </Card>

          <Button label="Evrene Dön" onPress={onDone} />
          <Button ghost label="Yeni Görev Üret" onPress={() => generate()} />
        </ScrollView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.box}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Title>{quest?.title ?? 'Macera Motoru'}</Title>
        {!quest ? (
          <Card>
            <Body>Oynamak istediğin mini oyun motorunu seç:</Body>
            <View style={styles.row}>
              {(['matrix', 'algorithm', 'dilemma'] as const).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => setWantedType(t)}
                  style={[styles.typeChip, wantedType === t && styles.typeChipOn]}
                >
                  <Text style={styles.typeChipText}>
                    {t === 'matrix' ? 'Enerji Matrisi' : t === 'algorithm' ? 'Algoritma Grid' : 'Stratejik İkilem'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Button disabled={busy} label={busy ? 'Üretiliyor…' : 'Görevi Başlat'} onPress={() => generate()} />
          </Card>
        ) : null}

        {quest?.payload.storyIntro ? <Body>{String(quest.payload.storyIntro)}</Body> : null}

        {quest?.type === 'matrix' ? (
          <Card>
            <Text style={styles.statusText}>
              Hedef: {String(quest.payload.targetValue)} · Şu an: {liveMatrix?.currentSum ?? 0}{' '}
              {liveMatrix?.valid ? '✓ Dengelendi!' : `(Fark: ${liveMatrix?.difference ?? 0})`}
            </Text>
            {nodes.map((n) => {
              const isOn = activeIds.includes(n.id)
              return (
                <Pressable
                  key={n.id}
                  onPress={() =>
                    setActiveIds((ids) => (ids.includes(n.id) ? ids.filter((id) => id !== n.id) : [...ids, n.id]))
                  }
                  style={[styles.node, isOn && styles.nodeOn]}
                >
                  <Text style={styles.nodeText}>{n.label}</Text>
                  <Text style={styles.nodeVal}>{n.value > 0 ? `+${n.value}` : n.value}</Text>
                </Pressable>
              )
            })}
          </Card>
        ) : null}

        {quest?.type === 'algorithm' ? (
          <Card>
            <Text style={styles.statusText}>
              Robot Konumu: ({liveAlgo?.finalPos.x},{liveAlgo?.finalPos.y}) {DIR_ARROWS[liveAlgo?.finalPos.dir ?? 'E']}{' '}
              {liveAlgo?.crashed ? '· Çarptı!' : liveAlgo?.reachedTarget ? '· Hedefe Ulaştı!' : ''}
            </Text>
            <View style={styles.gridWrap}>
              {Array.from({ length: gridHeight }).map((_, ry) => (
                <View key={ry} style={styles.gridRow}>
                  {Array.from({ length: gridWidth }).map((__, cx) => {
                    const isRobot = liveAlgo?.finalPos.x === cx && liveAlgo?.finalPos.y === ry
                    const isTarget = targetPos.x === cx && targetPos.y === ry
                    const isObs = obstacles.some((o) => o.x === cx && o.y === ry)
                    return (
                      <View
                        key={cx}
                        style={[
                          styles.cell,
                          isObs && styles.cellObs,
                          isTarget && styles.cellTarget,
                          isRobot && styles.cellRobot,
                        ]}
                      >
                        <Text style={styles.cellText}>
                          {isRobot
                            ? DIR_ARROWS[liveAlgo?.finalPos.dir ?? 'E']
                            : isTarget
                              ? '★'
                              : isObs
                                ? '■'
                                : ''}
                        </Text>
                      </View>
                    )
                  })}
                </View>
              ))}
            </View>
            <View style={styles.row}>
              <Button label="İleri (MOVE)" onPress={() => setCommands((prev) => [...prev, 'MOVE'])} />
              <Button ghost label="Sola Dön" onPress={() => setCommands((prev) => [...prev, 'TURN_LEFT'])} />
              <Button ghost label="Sağa Dön" onPress={() => setCommands((prev) => [...prev, 'TURN_RIGHT'])} />
              <Button ghost label="Sıfırla" onPress={() => setCommands([])} />
            </View>
            <Body>Komutlar: {commands.length ? commands.join(' → ') : 'Henüz komut eklenmedi'}</Body>
          </Card>
        ) : null}

        {quest?.type === 'dilemma' ? (
          <Card>
            <Body>{String(quest.payload.scenario ?? '')}</Body>
            {((quest.payload.choices as Array<{ id: string; label: string; consequence?: string }>) ?? []).map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setChoice(c.id)}
                style={[styles.node, choice === c.id && styles.nodeOn]}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.nodeText}>{c.label}</Text>
                  {choice === c.id && c.consequence ? (
                    <Text style={styles.consequenceText}>{c.consequence}</Text>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </Card>
        ) : null}

        {quest ? (
          <>
            {hintsUsed > 0 ? (
              <Card>
                <Text style={styles.sectionTitle}>Sokratik İpuçları ({hintsUsed}/{hints.length})</Text>
                {hints.slice(0, hintsUsed).map((h, i) => (
                  <Body key={i}>💡 {h}</Body>
                ))}
              </Card>
            ) : null}

            {hintsUsed < hints.length ? (
              <Button
                ghost
                label={`İpucu Al (${hintsUsed}/${hints.length})`}
                onPress={() => setHintsUsed((h) => h + 1)}
              />
            ) : null}

            <Field
              placeholder="Neden böyle düşündün? (Açıklaman ekstra XP kazandırır)"
              value={explanation}
              onChangeText={setExplanation}
            />
            <Button disabled={busy} label={busy ? 'Değerlendiriliyor…' : 'Görevi Teslim Et'} onPress={submit} />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  box: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 22, gap: 12, paddingBottom: 40 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  typeChipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  typeChipText: { color: colors.text, fontWeight: '700', fontSize: 13 },
  statusText: { color: colors.accent, fontWeight: '700', fontSize: 14 },
  sectionTitle: { color: colors.text, fontWeight: '800', fontSize: 16 },
  xpBadge: { color: '#01d4ff', fontSize: 24, fontWeight: '900' },
  progressBar: { height: 10, borderRadius: 99, backgroundColor: '#13072e', overflow: 'hidden', marginTop: 6 },
  progressFill: { height: '100%', backgroundColor: colors.accent },
  node: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  nodeOn: { backgroundColor: '#2a1650', borderColor: colors.accent },
  nodeText: { color: colors.text, flex: 1, fontWeight: '600' },
  consequenceText: { color: colors.muted, fontSize: 12 },
  nodeVal: { color: '#01d4ff', fontWeight: '800', fontSize: 16 },
  gridWrap: { alignSelf: 'center', gap: 6, marginVertical: 8 },
  gridRow: { flexDirection: 'row', gap: 6 },
  cell: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#13072e',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellObs: { backgroundColor: '#3f1d2e', borderColor: colors.danger },
  cellTarget: { backgroundColor: '#12352a', borderColor: colors.good },
  cellRobot: { backgroundColor: colors.accent, borderColor: '#ffffff' },
  cellText: { color: colors.text, fontSize: 20, fontWeight: '800' },
})
