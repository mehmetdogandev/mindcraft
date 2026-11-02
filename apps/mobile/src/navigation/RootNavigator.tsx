import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { AuthHostScreen } from '../screens/AuthHostScreen.tsx'
import { OnboardingScreen } from '../screens/OnboardingScreen.tsx'
import { HomeScreen } from '../screens/HomeScreen.tsx'
import { CourseSetupScreen } from '../screens/CourseSetupScreen.tsx'
import { MentorRoomScreen } from '../screens/MentorRoomScreen.tsx'
import { QuestScreen } from '../screens/QuestScreen.tsx'
import { SkillMapScreen } from '../screens/SkillMapScreen.tsx'
import { WeeklyScheduleScreen } from '../screens/WeeklyScheduleScreen.tsx'
import { ProfileSettingsScreen } from '../screens/ProfileSettingsScreen.tsx'
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
  onSignedOut,
  onOnboarded,
}: {
  signedIn: boolean
  onboarded: boolean
  geminiOn: boolean
  onSignedIn: () => void
  onSignedOut: () => void
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
                  onAddCourse={(termId) => navigation.navigate('CourseSetup', { termId })}
                  onCreateTeacher={(courseId) => navigation.navigate('CourseSetup', { courseId })}
                  onOpenSkills={() => navigation.navigate('Skills')}
                  onOpenSchedule={() => navigation.navigate('Schedule')}
                  onOpenProfile={() => navigation.navigate('Profile')}
                  onOpenQuest={(courseId, topic) => navigation.navigate('Quest', { courseId, topic })}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="CourseSetup" options={{ title: 'Ders ve Hoca' }}>
              {({ route, navigation }) => (
                <CourseSetupScreen
                  courseId={route.params.courseId}
                  termId={route.params.termId}
                  onDone={() => navigation.navigate('Home')}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Mentor" options={{ title: 'Öğretmen Odası' }}>
              {({ route, navigation }) => (
                <MentorRoomScreen
                  characterId={route.params.characterId}
                  courseId={route.params.courseId}
                  onStartQuest={(courseId, topic) => navigation.navigate('Quest', { courseId, topic })}
                  onEditTeacher={(courseId) => navigation.navigate('CourseSetup', { courseId })}
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
            <Stack.Screen name="Schedule" options={{ title: 'Haftalık Program' }}>
              {({ navigation }) => (
                <WeeklyScheduleScreen
                  onAddCourse={(termId) => navigation.navigate('CourseSetup', { termId })}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Profile" options={{ title: 'Profil ve Ayarlar' }}>
              {() => <ProfileSettingsScreen onSignedOut={onSignedOut} />}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}
