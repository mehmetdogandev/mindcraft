import { useState } from 'react'
import { Alert, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CourseDraftForm } from '../components/CourseDraftForm.tsx'
import { Body, Button, Title } from '../components/ui.tsx'
import { newCourseDraft } from '../lib/courses/draft.ts'
import { saveCourseWithTeacher } from '../lib/courses/save.ts'
import { trpc } from '../lib/api/trpc.ts'
import { colors } from '../lib/theme.ts'

export function CourseSetupScreen({
  courseId,
  termId,
  onDone,
}: {
  courseId?: string
  termId?: string
  onDone: () => void
}) {
  const teacherOnly = Boolean(courseId)
  const [draft, setDraft] = useState(newCourseDraft())
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!teacherOnly && !draft.name.trim()) {
      Alert.alert('Ders', 'Ders adını yaz.')
      return
    }
    if (!draft.teacherPrompt.trim()) {
      Alert.alert('Öğretmen', 'Bu dersin hocasını tarif et.')
      return
    }
    setBusy(true)
    try {
      let activeTermId = termId
      if (!activeTermId) {
        const terms = await trpc().calendar.terms.list.query()
        activeTermId = terms.find((item) => item.isActive)?.id ?? terms[0]?.id
      }
      if (!activeTermId) {
        throw new Error('Önce bir dönem oluştur')
      }
      if (teacherOnly && courseId) {
        await trpc().characters.create.mutate({
          kind: 'mentor',
          courseId,
          method: 'describe',
          prompt: draft.teacherPrompt.trim(),
          skeletonHint: 'creature',
        })
      } else {
        const existing = await trpc().calendar.courses.list.query()
        await saveCourseWithTeacher(draft, activeTermId, existing.length)
      }
      onDone()
    } catch (error) {
      Alert.alert('Kayıt', error instanceof Error ? error.message : 'AI veya sunucu kapalı olabilir')
    } finally {
      setBusy(false)
    }
  }

  return (
    <SafeAreaView style={styles.box}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Title>{teacherOnly ? 'Ders hocası' : 'Yeni ders'}</Title>
        <Body>
          {teacherOnly
            ? 'Bu dersin öğretmeni henüz yok. Tarifi yalnızca bu derse bağlı kalır.'
            : 'Aktif döneme yeni ders ekle. Hocası başka derslerle paylaşılmaz.'}
        </Body>
        <CourseDraftForm value={draft} onChange={setDraft} teacherOnly={teacherOnly} />
        <Button
          disabled={busy}
          label={busy ? 'Üretiliyor…' : teacherOnly ? 'Öğretmeni yarat' : 'Dersi ve hocayı kaydet'}
          onPress={save}
        />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  box: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 22, gap: 14, paddingBottom: 40 },
})
