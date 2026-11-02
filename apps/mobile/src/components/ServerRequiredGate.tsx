import { useEffect, useState, type ReactNode } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { loadDb } from '../backend/db.ts'
import { fetchHealth, type Health } from '../lib/api/health.ts'
import { colors } from '../lib/theme.ts'

export function ServerRequiredGate({
  children,
  onHealth,
}: {
  children: ReactNode
  onHealth?: (health: Health) => void
}) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    async function boot() {
      await loadDb()
      const health = await fetchHealth()
      if (!active) return
      if (health) onHealth?.(health)
      setReady(true)
    }
    boot()
    return () => {
      active = false
    }
  }, [onHealth])

  if (!ready) {
    return (
      <View style={styles.box}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.muted}>Yerel oyun veritabanı hazırlanıyor…</Text>
      </View>
    )
  }

  return <>{children}</>
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 16,
  },
  muted: { color: colors.muted, textAlign: 'center', lineHeight: 22 },
})
