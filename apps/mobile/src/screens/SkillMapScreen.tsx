import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { calculateLevel } from '@mindcraft/game-rules'
import { trpc } from '../lib/api/trpc.ts'
import { colors } from '../lib/theme.ts'
import { Body, Title } from '../components/ui.tsx'

const axes = ['logic', 'creativity', 'resilience', 'criticalThinking', 'knowledge', 'communication'] as const
const labels: Record<(typeof axes)[number], string> = {
  logic: 'Mantık',
  creativity: 'Yaratıcılık',
  resilience: 'Dayanıklılık',
  criticalThinking: 'Eleştirel',
  knowledge: 'Bilgi',
  communication: 'İletişim',
}

export function SkillMapScreen() {
  const [xp, setXp] = useState(0)
  const [skills, setSkills] = useState<Record<string, number>>({})

  useEffect(() => {
    trpc()
      .progress.get.query()
      .then((row) => {
        setXp(row.progress.xp)
        setSkills(row.progress.skills)
      })
      .catch(() => undefined)
  }, [])

  const level = calculateLevel(xp)

  return (
    <SafeAreaView style={styles.box}>
      <Title>Beceri haritası</Title>
      <Body>
        {level.title} · {xp} XP · sonraki eşik {level.nextLevelXP}
      </Body>
      {axes.map((axis) => (
        <View key={axis} style={styles.row}>
          <Text style={styles.label}>{labels[axis]}</Text>
          <View style={styles.bar}>
            <View style={[styles.fill, { width: `${Math.min(100, skills[axis] ?? 0)}%` }]} />
          </View>
          <Text style={styles.value}>{skills[axis] ?? 0}</Text>
        </View>
      ))}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  box: { flex: 1, backgroundColor: colors.bg, padding: 22, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { color: colors.muted, width: 110 },
  bar: { flex: 1, height: 10, borderRadius: 99, backgroundColor: colors.card, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.accent },
  value: { color: colors.text, width: 28, textAlign: 'right' },
})
