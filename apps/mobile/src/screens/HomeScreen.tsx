import { useCallback, useState } from 'react'
import { Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFocusEffect } from '@react-navigation/native'
import { calculateLevel } from '@mindcraft/game-rules'
import type { NpcAppearance } from '@mindcraft/sprites'
import { trpc } from '../lib/api/trpc.ts'
import { colors } from '../lib/theme.ts'
import { AcademicNPC } from '../components/AcademicNPC.tsx'
import { Body, Button, Card, Field, Title } from '../components/ui.tsx'
import type { PlanItem } from '../backend/db.ts'

const WINDOW_LABELS: Record<string, string> = {
  pre: 'DERS ÖNCESİ HAZIRLIK',
  post: 'DERS SONRASI PEKİŞTİRME',
  evening: 'AKŞAM TEKRARI',
  explore: 'SERBEST KEŞİF',
}

type HomeData = {
  displayName: string
  termName?: string
  avatar?: Partial<NpcAppearance>
  progress: { xp: number; title: string; level: number; currentLevelXP: number; nextLevelXP: number }
  courses: Array<{ id: string; name: string; color: string; realmId: string }>
  characters: Array<{
    id: string
    courseId: string | null
    profile: {
      name?: string
      title?: string
      appearance?: Partial<NpcAppearance>
    }
  }>
  restDay: boolean
  planItems: PlanItem[]
}

export function HomeScreen({
  geminiOn: _geminiOn,
  onOpenMentor,
  onAddCourse,
  onCreateTeacher,
  onOpenSkills,
  onOpenSchedule,
  onOpenProfile,
  onOpenQuest,
}: {
  geminiOn: boolean
  onOpenMentor: (characterId: string, courseId?: string) => void
  onAddCourse: (termId?: string) => void
  onCreateTeacher: (courseId: string) => void
  onOpenSkills: () => void
  onOpenSchedule: () => void
  onOpenProfile: () => void
  onOpenQuest: (courseId?: string, topic?: string) => void
}) {
  const [data, setData] = useState<HomeData | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [termId, setTermId] = useState<string | undefined>()
  const [reportingCourseId, setReportingCourseId] = useState<string | null>(null)
  const [reportedTopic, setReportedTopic] = useState('')

  const load = useCallback(async () => {
    const profile = await trpc().profile.get.query()
    const terms = await trpc().calendar.terms.list.query()
    const allCourses = await trpc().calendar.courses.list.query()
    const courses = allCourses.filter((c) => c.progressStatus === 'current')
    const characters = await trpc().characters.list.query()
    const today = await trpc().plan.today.query()
    const activeTerm = terms.find((item) => item.isActive) ?? terms[0]
    setTermId(activeTerm?.id)
    const level = calculateLevel(profile.progress.xp)
    setData({
      displayName: profile.profile.displayName || profile.user.name || 'Kâşif',
      termName: activeTerm?.name,
      avatar: profile.avatar?.profile.appearance,
      progress: {
        xp: profile.progress.xp,
        title: level.title,
        level: level.level,
        currentLevelXP: level.currentLevelXP,
        nextLevelXP: level.nextLevelXP,
      },
      courses,
      characters: characters
        .filter((c) => c.kind === 'mentor')
        .map((c) => ({
          id: c.id,
          courseId: c.courseId,
          profile: (c.profile ?? {}) as {
            name?: string
            title?: string
            appearance?: Partial<NpcAppearance>
          },
        })),
      restDay: Boolean(today.plan?.restDay),
      planItems: ((today.plan?.items as PlanItem[]) ?? []).filter((item) => !item.deferred),
    })
  }, [])

  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined)
    }, [load])
  )

  async function submitClassTopic(courseId: string) {
    if (!reportedTopic.trim()) return
    const topic = reportedTopic.trim()
    setReportedTopic('')
    setReportingCourseId(null)
    await trpc().plan.reportTopic.mutate({ courseId, topic })
    await load()
    Alert.alert('Konu Kaydedildi', `"${topic}" için ders sonrası görevi günlük planına eklendi!`)
  }

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
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <Image
              source={require('../../assets/logos/logo-mark.webp')}
              style={styles.mark}
              resizeMode="contain"
            />
            <View>
              <Title>{data?.displayName ?? 'Evren'}</Title>
              <Body>
                {data
                  ? `${data.progress.title} · Sv. ${data.progress.level} · ${data.progress.xp} XP`
                  : 'Yükleniyor'}
              </Body>
            </View>
          </View>
          <Pressable onPress={onOpenProfile}>
            <AcademicNPC appearance={data?.avatar} size={54} />
          </Pressable>
        </View>

        {data ? (
          <View style={styles.xpBar}>
            <View
              style={[
                styles.xpFill,
                {
                  width: `${Math.min(
                    100,
                    Math.round((data.progress.currentLevelXP / data.progress.nextLevelXP) * 100)
                  )}%`,
                },
              ]}
            />
          </View>
        ) : null}

        <View style={styles.navActions}>
          <Pressable style={styles.actionPill} onPress={onOpenSchedule}>
            <Text style={styles.actionPillText}>📅 Haftalık Program</Text>
          </Pressable>
          <Pressable style={styles.actionPill} onPress={onOpenSkills}>
            <Text style={styles.actionPillText}>🕸️ Beceri Haritası</Text>
          </Pressable>
          <Pressable style={styles.actionPill} onPress={onOpenProfile}>
            <Text style={styles.actionPillText}>👤 Profil & AI</Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.section}>Bugünün Oyun Planı</Text>
          <View style={styles.planTools}>
            <Pressable
              onPress={async () => {
                await trpc().plan.refresh.mutate()
                await load()
              }}
            >
              <Text style={styles.toolLink}>Yenile</Text>
            </Pressable>
            <Pressable
              onPress={async () => {
                await trpc().plan.restDay.mutate({ restDay: !data?.restDay })
                await load()
              }}
            >
              <Text style={styles.toolLink}>{data?.restDay ? 'Planı Aç' : 'Bugün Dinlen'}</Text>
            </Pressable>
          </View>
        </View>

        {data?.restDay ? (
          <Card>
            <Text style={styles.cardTitle}>🌙 Dinlenme Günü Aktif</Text>
            <Body>
              Bugün mola verdin. Serin veya beceri puanların silinmez; hazır hissettiğinde "Planı Aç" ile
              devam edebilirsin.
            </Body>
          </Card>
        ) : (
          (data?.planItems ?? []).map((item, index) => (
            <Card key={item.id ?? `${item.title}-${index}`}>
              <View style={styles.planHead}>
                <Text style={styles.kicker}>{WINDOW_LABELS[item.window] ?? item.window}</Text>
                <Pressable
                  onPress={async () => {
                    await trpc().plan.defer.mutate({ itemId: item.id })
                    await load()
                  }}
                >
                  <Text style={styles.deferText}>Ertele</Text>
                </Pressable>
              </View>
              <Pressable onPress={() => onOpenQuest(item.courseId, item.topic)}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.muted}>{item.story || item.topic}</Text>
              </Pressable>
            </Card>
          ))
        )}

        <Text style={styles.section}>
          Dersler ve Hocaların {data?.termName ? `(${data.termName})` : ''}
        </Text>
        {(data?.courses ?? []).map((course) => {
          const mentor = data?.characters.find((c) => c.courseId === course.id)
          const isReporting = reportingCourseId === course.id
          return (
            <Card key={course.id}>
              <Pressable
                onPress={() => {
                  if (mentor) onOpenMentor(mentor.id, course.id)
                  else onCreateTeacher(course.id)
                }}
                style={styles.courseRow}
              >
                {mentor ? (
                  <AcademicNPC appearance={mentor.profile.appearance} size={64} />
                ) : null}
                <View style={styles.courseInfo}>
                  <View style={styles.courseHead}>
                    <View style={[styles.dot, { backgroundColor: course.color }]} />
                    <Text style={styles.cardTitle}>{course.name}</Text>
                  </View>
                  <Text style={styles.muted}>
                    {mentor?.profile.name
                      ? `${mentor.profile.name}${mentor.profile.title ? ` · ${mentor.profile.title}` : ''}`
                      : 'Öğretmen yok — dokun, bu derse hoca tasarla'}
                  </Text>
                </View>
              </Pressable>

              <View style={styles.courseFooter}>
                <Pressable
                  onPress={() =>
                    setReportingCourseId(isReporting ? null : course.id)
                  }
                >
                  <Text style={styles.toolLink}>
                    {isReporting ? 'Vazgeç' : '📝 Bugün derste ne işlediniz?'}
                  </Text>
                </Pressable>
                <Pressable onPress={() => onOpenQuest(course.id, course.name)}>
                  <Text style={styles.toolLink}>⚡ Hızlı Görev</Text>
                </Pressable>
              </View>

              {isReporting ? (
                <View style={styles.reportBox}>
                  <Field
                    placeholder="İşlenen konu (örn: İkili Arama Ağaçları)"
                    value={reportedTopic}
                    onChangeText={setReportedTopic}
                  />
                  <Button
                    label="Konuya Özel Görev Oluştur"
                    onPress={() => submitClassTopic(course.id)}
                  />
                </View>
              ) : null}
            </Card>
          )
        })}

        <Button label="+ Döneme Yeni Ders ve Hoca Ekle" onPress={() => onAddCourse(termId)} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  box: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 22, gap: 12, paddingBottom: 40 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  mark: { width: 48, height: 48 },
  xpBar: { height: 8, borderRadius: 99, backgroundColor: colors.card, overflow: 'hidden' },
  xpFill: { height: '100%', backgroundColor: colors.accent },
  navActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  actionPill: {
    flex: 1,
    minWidth: 100,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  actionPillText: { color: colors.text, fontWeight: '700', fontSize: 12 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  planTools: { flexDirection: 'row', gap: 14 },
  toolLink: { color: '#01d4ff', fontWeight: '700', fontSize: 12 },
  planHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deferText: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  kicker: { color: colors.accent, textTransform: 'uppercase', fontSize: 11, fontWeight: '800' },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  muted: { color: colors.muted, lineHeight: 20 },
  section: { color: colors.text, fontSize: 18, fontWeight: '800' },
  courseRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  courseInfo: { flex: 1, gap: 4 },
  courseHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  courseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reportBox: { gap: 8, marginTop: 6 },
})
