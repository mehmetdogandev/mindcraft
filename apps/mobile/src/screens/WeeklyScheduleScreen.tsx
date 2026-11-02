import { useCallback, useEffect, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { WEEKDAYS } from '../lib/courses/draft.ts'
import { trpc } from '../lib/api/trpc.ts'
import { colors } from '../lib/theme.ts'
import { Body, Button, Card, Field, Title } from '../components/ui.tsx'
import type {
  CalendarEventRow,
  CourseMeetingRow,
  CourseRow,
  ScheduleExceptionRow,
  TermRow,
} from '../backend/db.ts'

const EXCEPTION_LABELS: Record<ScheduleExceptionRow['kind'], string> = {
  cancel: 'Ders İptal',
  reschedule: 'Saat Değişikliği',
  makeup: 'Telafi Dersi',
  holiday: 'Tatil',
}

export function WeeklyScheduleScreen({
  onAddCourse,
}: {
  onAddCourse: (termId?: string) => void
}) {
  const [terms, setTerms] = useState<TermRow[]>([])
  const [courses, setCourses] = useState<CourseRow[]>([])
  const [meetings, setMeetings] = useState<CourseMeetingRow[]>([])
  const [exceptions, setExceptions] = useState<ScheduleExceptionRow[]>([])
  const [events, setEvents] = useState<CalendarEventRow[]>([])

  const [tab, setTab] = useState<'grid' | 'exceptions' | 'events' | 'terms'>('grid')

  // Exception form
  const [exCourseId, setExCourseId] = useState<string | undefined>()
  const [exDate, setExDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [exKind, setExKind] = useState<ScheduleExceptionRow['kind']>('cancel')
  const [exNote, setExNote] = useState('')

  // Event form
  const [evtTitle, setEvtTitle] = useState('')
  const [evtDate, setEvtDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [evtKind, setEvtKind] = useState('Vize')

  // New Term form
  const [newTermName, setNewTermName] = useState('')
  const [newTermStart, setNewTermStart] = useState('2027-02-01')
  const [newTermEnd, setNewTermEnd] = useState('2027-06-15')

  const load = useCallback(async () => {
    const [t, c, m, ex, ev] = await Promise.all([
      trpc().calendar.terms.list.query(),
      trpc().calendar.courses.list.query(),
      trpc().calendar.meetings.list.query(),
      trpc().calendar.exceptions.list.query(),
      trpc().calendar.events.list.query(),
    ])
    setTerms(t)
    setCourses(c)
    setMeetings(m)
    setExceptions(ex)
    setEvents(ev)
    if (!exCourseId && c.length > 0) {
      setExCourseId(c[0].id)
    }
  }, [exCourseId])

  useEffect(() => {
    load().catch(() => undefined)
  }, [load])

  const activeTerm = terms.find((t) => t.isActive) ?? terms[0]
  const currentCourses = courses.filter((c) => c.progressStatus === 'current')
  const pastCourses = courses.filter((c) => c.progressStatus !== 'current')

  async function addException() {
    if (!exDate.trim()) return
    try {
      await trpc().calendar.exceptions.upsert.mutate({
        courseId: exKind === 'holiday' ? undefined : exCourseId,
        date: exDate.trim(),
        kind: exKind,
        note: exNote.trim() || undefined,
      })
      setExNote('')
      await load()
      Alert.alert('Kaydedildi', 'Takvim istisnası eklendi; o günün planı buna göre güncellenecek.')
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Eklenemedi')
    }
  }

  async function addEvent() {
    if (!evtTitle.trim() || !evtDate.trim()) {
      Alert.alert('Eksik Bilgi', 'Etkinlik/sınav adı ve tarih girin.')
      return
    }
    try {
      await trpc().calendar.events.upsert.mutate({
        termId: activeTerm?.id,
        title: evtTitle.trim(),
        date: evtDate.trim(),
        kind: evtKind,
      })
      setEvtTitle('')
      await load()
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Eklenemedi')
    }
  }

  async function createNewTerm() {
    if (!newTermName.trim()) {
      Alert.alert('Dönem', 'Yeni dönem adını yazın.')
      return
    }
    try {
      await trpc().calendar.terms.upsert.mutate({
        name: newTermName.trim(),
        startDate: newTermStart.trim(),
        endDate: newTermEnd.trim(),
        activate: true,
      })
      setNewTermName('')
      await load()
      Alert.alert(
        'Yeni Dönem Aktif',
        'Önceki dönemin dersleri tamamlananlara taşındı; öğretmenlerin ve becerilerin korundu.'
      )
    } catch (err) {
      Alert.alert('Hata', err instanceof Error ? err.message : 'Dönem açılamadı')
    }
  }

  return (
    <SafeAreaView style={styles.box}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Title>Akademik Takvim</Title>
        <Body>
          {activeTerm
            ? `Aktif Dönem: ${activeTerm.name} (${activeTerm.startDate} – ${activeTerm.endDate})`
            : 'Henüz dönem oluşturulmadı'}
        </Body>

        <View style={styles.tabRow}>
          {(
            [
              { key: 'grid', label: 'Haftalık Çizelge' },
              { key: 'exceptions', label: 'İptal / Tatil' },
              { key: 'events', label: 'Sınavlar' },
              { key: 'terms', label: 'Dönemler' },
            ] as const
          ).map((item) => (
            <Pressable
              key={item.key}
              onPress={() => setTab(item.key)}
              style={[styles.tabBtn, tab === item.key && styles.tabBtnOn]}
            >
              <Text style={[styles.tabText, tab === item.key && styles.tabTextOn]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        {tab === 'grid' ? (
          <>
            {WEEKDAYS.map((day) => {
              const daySlots = meetings
                .filter(
                  (m) =>
                    m.weekday === day.value &&
                    currentCourses.some((c) => c.id === m.courseId)
                )
                .sort((a, b) => a.startTime.localeCompare(b.startTime))

              return (
                <Card key={day.value}>
                  <Text style={styles.dayTitle}>{day.label}</Text>
                  {daySlots.length === 0 ? (
                    <Text style={styles.emptyText}>Bu gün kayıtlı ders oturumu yok.</Text>
                  ) : (
                    daySlots.map((slot) => {
                      const course = currentCourses.find((c) => c.id === slot.courseId)
                      return (
                        <View key={slot.id} style={styles.slotItem}>
                          <View style={[styles.dot, { backgroundColor: course?.color ?? colors.accent }]} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.slotCourse}>{course?.name ?? 'Ders'}</Text>
                            <Text style={styles.slotTime}>
                              {slot.startTime} – {slot.endTime}
                              {slot.room ? ` · ${slot.room}` : ''}
                            </Text>
                          </View>
                        </View>
                      )
                    })
                  )}
                </Card>
              )
            })}
            <Button label="+ Yeni Ders ve Oturum Ekle" onPress={() => onAddCourse(activeTerm?.id)} />
          </>
        ) : null}

        {tab === 'exceptions' ? (
          <>
            <Card>
              <Text style={styles.dayTitle}>Ders İptali / Telafi / Tatil Bildir</Text>
              <Body>Tek günlük değişiklikler haftalık şablonunu bozmaz; sadece seçtiğin tarihi etkiler.</Body>
              <View style={styles.tabRow}>
                {(['cancel', 'makeup', 'reschedule', 'holiday'] as const).map((k) => (
                  <Pressable
                    key={k}
                    onPress={() => setExKind(k)}
                    style={[styles.tabBtn, exKind === k && styles.tabBtnOn]}
                  >
                    <Text style={[styles.tabText, exKind === k && styles.tabTextOn]}>
                      {EXCEPTION_LABELS[k]}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {exKind !== 'holiday' ? (
                <View style={styles.tabRow}>
                  {currentCourses.map((c) => (
                    <Pressable
                      key={c.id}
                      onPress={() => setExCourseId(c.id)}
                      style={[styles.tabBtn, exCourseId === c.id && styles.tabBtnOn]}
                    >
                      <Text style={[styles.tabText, exCourseId === c.id && styles.tabTextOn]}>
                        {c.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <Field placeholder="Tarih YYYY-MM-DD" value={exDate} onChangeText={setExDate} />
              <Field placeholder="Not (örn: Hoca konferansta)" value={exNote} onChangeText={setExNote} />
              <Button label="İstisnayı Kaydet" onPress={addException} />
            </Card>

            {exceptions.map((ex) => {
              const course = courses.find((c) => c.id === ex.courseId)
              return (
                <Card key={ex.id}>
                  <View style={styles.rowBetween}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.slotCourse}>
                        {EXCEPTION_LABELS[ex.kind]} · {ex.date}
                      </Text>
                      <Text style={styles.slotTime}>
                        {course ? course.name : 'Tüm Dersler'} {ex.note ? `— ${ex.note}` : ''}
                      </Text>
                    </View>
                    <Pressable
                      onPress={async () => {
                        await trpc().calendar.exceptions.remove.mutate({ id: ex.id })
                        await load()
                      }}
                    >
                      <Text style={styles.deleteLink}>Sil</Text>
                    </Pressable>
                  </View>
                </Card>
              )
            })}
          </>
        ) : null}

        {tab === 'events' ? (
          <>
            <Card>
              <Text style={styles.dayTitle}>Sınav veya Ödev Tarihi Ekle</Text>
              <View style={styles.tabRow}>
                {['Vize', 'Final', 'Quiz', 'Proje Teslim'].map((k) => (
                  <Pressable
                    key={k}
                    onPress={() => setEvtKind(k)}
                    style={[styles.tabBtn, evtKind === k && styles.tabBtnOn]}
                  >
                    <Text style={[styles.tabText, evtKind === k && styles.tabTextOn]}>{k}</Text>
                  </Pressable>
                ))}
              </View>
              <Field
                placeholder="Başlık (örn: Veri Yapıları Vizesi)"
                value={evtTitle}
                onChangeText={setEvtTitle}
              />
              <Field placeholder="Tarih YYYY-MM-DD" value={evtDate} onChangeText={setEvtDate} />
              <Button label="Takvime Ekle" onPress={addEvent} />
            </Card>

            {events.map((ev) => (
              <Card key={ev.id}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.slotCourse}>
                      [{ev.kind}] {ev.title}
                    </Text>
                    <Text style={styles.slotTime}>Tarih: {ev.date}</Text>
                  </View>
                  <Pressable
                    onPress={async () => {
                      await trpc().calendar.events.remove.mutate({ id: ev.id })
                      await load()
                    }}
                  >
                    <Text style={styles.deleteLink}>Sil</Text>
                  </Pressable>
                </View>
              </Card>
            ))}
          </>
        ) : null}

        {tab === 'terms' ? (
          <>
            <Card>
              <Text style={styles.dayTitle}>Yeni Dönem Başlat</Text>
              <Body>
                Yeni dönem başlatıldığında eski dönemin dersleri tamamlananlara ayrılır; öğretmenlerin ve
                kazandığın beceri puanların silinmez.
              </Body>
              <Field
                placeholder="Yeni dönem adı (örn: 2027 Bahar)"
                value={newTermName}
                onChangeText={setNewTermName}
              />
              <Field
                placeholder="Başlangıç YYYY-MM-DD"
                value={newTermStart}
                onChangeText={setNewTermStart}
              />
              <Field placeholder="Bitiş YYYY-MM-DD" value={newTermEnd} onChangeText={setNewTermEnd} />
              <Button label="Yeni Dönemi Aktifleştir" onPress={createNewTerm} />
            </Card>

            <Text style={styles.dayTitle}>Kayıtlı Dönemler</Text>
            {terms.map((t) => (
              <Card key={t.id}>
                <Text style={styles.slotCourse}>
                  {t.name} {t.isActive ? '· (Aktif)' : '· (Geçmiş)'}
                </Text>
                <Text style={styles.slotTime}>
                  {t.startDate} – {t.endDate}
                </Text>
              </Card>
            ))}

            {pastCourses.length > 0 ? (
              <>
                <Text style={styles.dayTitle}>Geçmiş Dönem Dersleri</Text>
                {pastCourses.map((c) => (
                  <Card key={c.id}>
                    <Text style={styles.slotCourse}>{c.name}</Text>
                    <Text style={styles.slotTime}>Durum: Tamamlandı ({c.realmId})</Text>
                  </Card>
                ))}
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  box: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 22, gap: 12, paddingBottom: 40 },
  tabRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tabBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tabBtnOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  tabText: { color: colors.muted, fontWeight: '700', fontSize: 12 },
  tabTextOn: { color: colors.accentText },
  dayTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  emptyText: { color: colors.muted, fontSize: 13 },
  slotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  slotCourse: { color: colors.text, fontWeight: '700', fontSize: 15 },
  slotTime: { color: colors.muted, fontSize: 13 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  deleteLink: { color: colors.danger, fontWeight: '700', fontSize: 13 },
})
