import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { AuthHostScreen } from '../screens/AuthHostScreen.tsx'
import { OnboardingScreen } from '../screens/OnboardingScreen.tsx'
import { HomeScreen } from '../screens/HomeScreen.tsx'
import { MentorRoomScreen } from '../screens/MentorRoomScreen.tsx'
import { QuestScreen } from '../screens/QuestScreen.tsx'
import { SkillMapScreen } from '../screens/SkillMapScreen.tsx'
import { colors } from '../lib/theme.ts'
import type { RootStackParamList } from './types.ts'

const Stack = createNativeStackNavigator<RootStackParamList>()

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.card,
    text: colors.text,
    border: colors.border,
    primary: colors.accent,
  },
}

export function RootNavigator({
  signedIn,
  onboarded,
  geminiOn,
  onSignedIn,
  onOnboarded,
}: {
  signedIn: boolean
  onboarded: boolean
  geminiOn: boolean
  onSignedIn: () => void
  onOnboarded: () => void
}) {
  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        {!signedIn ? (
          <Stack.Screen name="Auth" options={{ headerShown: false }}>
            {() => <AuthHostScreen onReady={onSignedIn} />}
          </Stack.Screen>
        ) : !onboarded ? (
          <Stack.Screen name="Onboarding" options={{ title: 'Kurulum' }}>
            {() => <OnboardingScreen onDone={onOnboarded} />}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Home" options={{ headerShown: false }}>
              {({ navigation }) => (
                <HomeScreen
                  geminiOn={geminiOn}
                  onOpenMentor={(characterId, courseId) =>
                    navigation.navigate('Mentor', { characterId, courseId })
                  }
                  onOpenSkills={() => navigation.navigate('Skills')}
                  onOpenQuest={(courseId, topic) => navigation.navigate('Quest', { courseId, topic })}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Mentor" options={{ title: 'Öğretmen' }}>
              {({ route, navigation }) => (
                <MentorRoomScreen
                  characterId={route.params.characterId}
                  courseId={route.params.courseId}
                  onStartQuest={(courseId, topic) => navigation.navigate('Quest', { courseId, topic })}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Quest" options={{ title: 'Görev' }}>
              {({ route, navigation }) => (
                <QuestScreen
                  courseId={route.params.courseId}
                  topic={route.params.topic}
                  onDone={() => navigation.navigate('Home')}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Skills" options={{ title: 'Beceriler' }} component={SkillMapScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
