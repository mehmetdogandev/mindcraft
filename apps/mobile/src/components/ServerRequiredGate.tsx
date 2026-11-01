import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { fetchHealth, type Health } from '../lib/api/health.ts'
import { colors } from '../lib/theme.ts'
import { BrandMark } from './BrandMark.tsx'
import { Button } from './ui.tsx'

export function ServerRequiredGate({
  children,
  onHealth,
}: {
  children: ReactNode
  onHealth?: (health: Health) => void
}) {
  const [health, setHealth] = useState<Health | null | undefined>(undefined)
  const abort = useRef<AbortController | null>(null)

  const check = useCallback(async () => {
    abort.current?.abort()
    const ctrl = new AbortController()
    abort.current = ctrl
    const next = await fetchHealth(ctrl.signal)
    if (ctrl.signal.aborted) return
    setHealth(next)
    if (next) onHealth?.(next)
  }, [onHealth])

  useEffect(() => {
    check()
    const id = setInterval(check, 5000)
    return () => {
      clearInterval(id)
      abort.current?.abort()
    }
  }, [check])

  if (health === undefined) {
    return (
      <View style={styles.box}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.muted}>Sunucuya bağlanılıyor…</Text>
      </View>
    )
  }

  if (!health) {
    return (
      <View style={styles.box}>
        <BrandMark />
        <Text style={styles.muted}>
          Bağlantıda bir sorun var. Uygulama yalnızca sunucu ayaktayken çalışır. Sahte bir evren
          açılmadı.
        </Text>
        <Button label="Tekrar dene" onPress={check} />
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
