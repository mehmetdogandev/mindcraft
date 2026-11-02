import { useCallback, useEffect, useState } from 'react'
import { StatusBar } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ServerRequiredGate } from './src/components/ServerRequiredGate.tsx'
import { RootNavigator } from './src/navigation/RootNavigator.tsx'
import { getToken } from './src/lib/auth/storage.ts'
import { trpc } from './src/lib/api/trpc.ts'
import type { Health } from './src/lib/api/health.ts'

export function App() {
  const [signedIn, setSignedIn] = useState(false)
  const [onboarded, setOnboarded] = useState(false)
  const [geminiOn, setGeminiOn] = useState(false)

  const refreshProfile = useCallback(async () => {
    const token = await getToken()
    if (!token) {
      setSignedIn(false)
      setOnboarded(false)
      return
    }
    try {
      const profile = await trpc().profile.get.query()
      setSignedIn(true)
      setOnboarded(Boolean(profile.profile?.onboardingComplete))
    } catch {
      setSignedIn(false)
    }
  }, [])

  useEffect(() => {
    refreshProfile()
  }, [refreshProfile])

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0D0421" />
      <ServerRequiredGate
        onHealth={(health: Health) => setGeminiOn(Boolean(health.gemini?.configured && health.gemini?.ok))}
      >
        <RootNavigator
          signedIn={signedIn}
          onboarded={onboarded}
          geminiOn={geminiOn}
          onSignedIn={() => {
            setSignedIn(true)
            refreshProfile()
          }}
          onSignedOut={() => {
            setSignedIn(false)
            setOnboarded(false)
          }}
          onOnboarded={() => setOnboarded(true)}
        />
      </ServerRequiredGate>
    </SafeAreaProvider>
  )
}
