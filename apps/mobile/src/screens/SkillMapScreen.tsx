import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Circle, Line, Polygon, Text as SvgText } from 'react-native-svg'
import { calculateLevel, EMPTY_SKILLS, type SkillScores } from '@mindcraft/game-rules'
import { trpc } from '../lib/api/trpc.ts'
import { colors } from '../lib/theme.ts'
import { Body, Card, Title } from '../components/ui.tsx'

const axes = ['logic', 'creativity', 'resilience', 'criticalThinking', 'knowledge', 'communication'] as const
const labels: Record<(typeof axes)[number], string> = {
  logic: 'Mantık',
  creativity: 'Yaratıcılık',
  resilience: 'Dayanıklılık',
  criticalThinking: 'Eleştirel',
  knowledge: 'Bilgi',
  communication: 'İletişim',
}

function polarPoint(cx: number, cy: number, radius: number, index: number, total: number) {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  }
}

export function SkillMapScreen() {
  const [xp, setXp] = useState(0)
  const [skills, setSkills] = useState<SkillScores>(EMPTY_SKILLS)
  const [questsCompleted, setQuestsCompleted] = useState(0)
  const [mistakesEmbraced, setMistakesEmbraced] = useState(0)
  const [streakDays, setStreakDays] = useState(1)

  useEffect(() => {
    trpc()
      .progress.get.query()
      .then((row) => {
        setXp(row.progress.xp)
        setSkills(row.progress.skills)
        setQuestsCompleted(row.progress.questsCompleted)
        setMistakesEmbraced(row.progress.mistakesEmbraced)
        setStreakDays(row.progress.streakDays)
      })
      .catch(() => undefined)
  }, [])

  const level = calculateLevel(xp)
  const size = 250
  const center = size / 2
  const maxR = 82

  const rings = [0.33, 0.66, 1]
  const valuePoints = axes
    .map((axis, i) => {
      const val = Math.max(8, Math.min(100, skills[axis] ?? 0)) / 100
      const pt = polarPoint(center, center, maxR * val, i, axes.length)
      return `${pt.x},${pt.y}`
    })
    .join(' ')

  return (
    <SafeAreaView style={styles.box}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Title>Beceri Haritası</Title>
        <Body>
          {level.title} · Seviye {level.level} · {xp} XP (Sonraki seviye: {level.nextLevelXP} XP)
        </Body>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{questsCompleted}</Text>
            <Text style={styles.statLabel}>Tamamlanan Görev</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{mistakesEmbraced}</Text>
            <Text style={styles.statLabel}>Kucaklanan Hata</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{streakDays}</Text>
            <Text style={styles.statLabel}>Aktif Gün</Text>
          </View>
        </View>

        <Card>
          <View style={{ alignItems: 'center' }}>
            <Svg width={size} height={size}>
              {rings.map((r) => {
                const pts = axes
                  .map((_, i) => {
                    const p = polarPoint(center, center, maxR * r, i, axes.length)
                    return `${p.x},${p.y}`
                  })
                  .join(' ')
                return (
                  <Polygon
                    key={r}
                    points={pts}
                    fill="none"
                    stroke={colors.border}
                    strokeWidth={1}
                  />
                )
              })}
              {axes.map((axis, i) => {
                const outer = polarPoint(center, center, maxR, i, axes.length)
                const labelPt = polarPoint(center, center, maxR + 24, i, axes.length)
                return (
                  <Line
                    key={`line-${axis}`}
                    x1={center}
                    y1={center}
                    x2={outer.x}
                    y2={outer.y}
                    stroke={colors.border}
                    strokeWidth={1}
                  />
                )
              })}
              <Polygon
                points={valuePoints}
                fill="rgba(140, 49, 255, 0.35)"
                stroke={colors.accent}
                strokeWidth={2.5}
              />
              {axes.map((axis, i) => {
                const val = Math.max(8, Math.min(100, skills[axis] ?? 0)) / 100
                const pt = polarPoint(center, center, maxR * val, i, axes.length)
                const labelPt = polarPoint(center, center, maxR + 24, i, axes.length)
                return (
                  <Circle
                    key={`dot-${axis}`}
                    cx={pt.x}
                    cy={pt.y}
                    r={4}
                    fill="#01d4ff"
                  />
                )
              })}
              {axes.map((axis, i) => {
                const labelPt = polarPoint(center, center, maxR + 24, i, axes.length)
                return (
                  <SvgText
                    key={`txt-${axis}`}
                    x={labelPt.x}
                    y={labelPt.y + 4}
                    fill={colors.text}
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {labels[axis]}
                  </SvgText>
                )
              })}
            </Svg>
          </View>
        </Card>

        <Card>
          {axes.map((axis) => (
            <View key={axis} style={styles.row}>
              <Text style={styles.label}>{labels[axis]}</Text>
              <View style={styles.bar}>
                <View style={[styles.fill, { width: `${Math.min(100, skills[axis] ?? 0)}%` }]} />
              </View>
              <Text style={styles.value}>{skills[axis] ?? 0}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  box: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 22, gap: 14, paddingBottom: 40 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  statNumber: { color: '#01d4ff', fontSize: 22, fontWeight: '800' },
  statLabel: { color: colors.muted, fontSize: 11, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  label: { color: colors.muted, width: 100, fontWeight: '600' },
  bar: { flex: 1, height: 10, borderRadius: 99, backgroundColor: '#13072e', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.accent },
  value: { color: colors.text, width: 30, textAlign: 'right', fontWeight: '700' },
})
