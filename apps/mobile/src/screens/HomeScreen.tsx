import { useCallback, useState } from 'react'
import { Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { calculateLevel } from '@mindcraft/game-rules'
import { trpc } from '../lib/api/trpc.ts'
import { colors } from '../lib/theme.ts'
import { Body, Button, Card, Title } from '../components/ui.tsx'

type HomeData = {
  progress: { xp: number; title: string; level: number }
  courses: Array<{ id: string; name: string; color: string; realmId: string }>
  characters: Array<{ id: string; courseId: string | null; profile: { name?: string } }>
  planItems: Array<{ title?: string; topic?: string; courseId?: string; window?: string }>
  geminiOn: boolean
}

export function HomeScreen({
  geminiOn,
  onOpenMentor,
  onAddCourse,
  onCreateTeacher,
  onOpenSkills,
  onOpenQuest,
}: {
  geminiOn: boolean
  onOpenMentor: (characterId: string, courseId?: string) => void
  onAddCourse: (termId?: string) => void
  onCreateTeacher: (courseId: string) => void
  onOpenSkills: () => void
  onOpenQuest: (courseId?: string, topic?: string) => void
}) {
  const [data, setData] = useState<HomeData | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [termId, setTermId] = useState<string | undefined>()

  const load = useCallback(async () => {
    const profile = await trpc().profile.get.query()
    const terms = await trpc().calendar.terms.list.query()
    const courses = await trpc().calendar.courses.list.query()
    const characters = await trpc().characters.list.query()
    const today = await trpc().plan.today.query()
    setTermId(terms.find((item) => item.isActive)?.id ?? terms[0]?.id)
    const level = calculateLevel(profile.progress.xp)
    setData({
      progress: { xp: profile.progress.xp, title: level.title, level: level.level },
      courses,
      characters: characters.map((c) => ({
        id: c.id,
        courseId: c.courseId,
        profile: (c.profile ?? {}) as { name?: string },
      })),
      planItems: ((today.plan?.items as HomeData['planItems']) ?? []).map((item) => item),
      geminiOn,
    })
  }, [geminiOn])

  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined)
    }, [load])
  )

  return (
    <SafeAreaView style={styles.box}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.accent}
            onRefresh={async () => {
              setRefreshing(true)
              await load().catch(() => undefined)
              setRefreshing(false)
            }}
          />
        }
      >
        <Image
          source={require('../../assets/logos/logo-mark.webp')}
          style={styles.mark}
          resizeMode="contain"
        />
        <Title>Bugünün evreni</Title>
        <Body>
          {data ? `${data.progress.title} · Seviye ${data.progress.level} · ${data.progress.xp} XP` : 'Yükleniyor'}
        </Body>
        {!geminiOn ? (
          <Card>
            <Text style={styles.warn}>AI kapalı. Kayıtlı dersler duruyor; yeni sohbet / öğretmen / görev yok.</Text>
          </Card>
        ) : null}
        {(data?.planItems ?? []).map((item, index) => (
          <Pressable key={`${item.title}-${index}`} onPress={() => onOpenQuest(item.courseId, item.topic)}>
            <Card>
              <Text style={styles.kicker}>{item.window ?? 'öneri'}</Text>
              <Text style={styles.cardTitle}>{item.title ?? 'Macera'}</Text>
              <Text style={styles.muted}>{item.topic}</Text>
            </Card>
          </Pressable>
        ))}
        <Text style={styles.section}>Dersler</Text>
        {(data?.courses ?? []).map((course) => {
          const mentor = data?.characters.find((c) => c.courseId === course.id)
          return (
            <Pressable
              key={course.id}
              onPress={() => {
                if (mentor) onOpenMentor(mentor.id, course.id)
                else onCreateTeacher(course.id)
              }}
            >
              <Card>
                <View style={styles.courseHead}>
                  <View style={[styles.dot, { backgroundColor: course.color }]} />
                  <Text style={styles.cardTitle}>{course.name}</Text>
                </View>
                <Text style={styles.muted}>
                  {mentor?.profile.name ?? 'Öğretmen yok — dokun, bu derse hoca yarat'}
                </Text>
              </Card>
            </Pressable>
          )
        })}
        <Button label="Döneme ders ekle" onPress={() => onAddCourse(termId)} />
        <Button ghost label="Beceri haritası" onPress={onOpenSkills} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  box: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 22, gap: 12 },
  mark: { width: 56, height: 56 },
  warn: { color: colors.warn, lineHeight: 20 },
  kicker: { color: colors.accent, textTransform: 'uppercase', fontSize: 12, fontWeight: '700' },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  muted: { color: colors.muted },
  section: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 8 },
  courseHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 12, height: 12, borderRadius: 6 },
})
