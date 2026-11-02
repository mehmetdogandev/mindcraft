import { useEffect, useState } from 'react'
import { Alert, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { normalizeNpcAppearance } from '@mindcraft/sprites'
import { CourseDraftForm } from '../components/CourseDraftForm.tsx'
import { Body, Title } from '../components/ui.tsx'
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

  useEffect(() => {
    if (!courseId) return
    trpc()
      .characters.list.query()
      .then((chars) => {
        const existing = chars.find((c) => c.courseId === courseId)
        if (existing?.profile?.appearance) {
          setDraft((prev) => ({
            ...prev,
            teacherAppearance: normalizeNpcAppearance(existing.profile.appearance),
            teacherPrompt: existing.profile.personality || prev.teacherPrompt,
          }))
        }
      })
      .catch(() => undefined)
  }, [courseId])

  async function persistCharacter(exitAfterSave: boolean) {
    if (!teacherOnly && !draft.name.trim()) {
      Alert.alert('Ders', 'Ders adını yaz.')
      return
    }
    if (!draft.teacherPrompt.trim() && !draft.teacherAppearance) {
      Alert.alert('Karakter', 'Lütfen AI sohbet alanına karakterin nasıl görünmesini istediğini yaz.')
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
        const createdTerm = await trpc().calendar.terms.upsert.mutate({
          name: 'Aktif Dönem',
          startDate: '2026-09-15',
          endDate: '2027-01-15',
          activate: true,
        })
        activeTermId = createdTerm.id
      }
      if (teacherOnly && courseId) {
        await trpc().characters.create.mutate({
          kind: 'mentor',
          courseId,
          method: 'describe',
          prompt: draft.teacherPrompt.trim() || 'Akademik profesör',
          skeletonHint: 'humanoid',
          appearance: draft.teacherAppearance,
        })
      } else {
        const existing = await trpc().calendar.courses.list.query()
        await saveCourseWithTeacher(draft, activeTermId, existing.length)
      }
      if (exitAfterSave) {
        onDone()
      } else {
        Alert.alert('Kaydedildi', 'Karakter görünümü kaydedildi. Sohbet üzerinden düzenlemeye devam edebilir veya oyun dünyasına ekleyebilirsin.')
      }
    } catch (error) {
      Alert.alert('Kayıt', error instanceof Error ? error.message : 'Kayıt yapılamadı')
    } finally {
      setBusy(false)
    }
  }

  return (
    <SafeAreaView style={styles.box}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Title>{teacherOnly ? 'AI Karakter Tasarımı' : 'Yeni Ders ve Karakter'}</Title>
        <Body>
          {teacherOnly
            ? 'Hocanı doğal dille tarif et ve AI ile konuşarak görünümünü adım adım şekillendir.'
            : 'Aktif döneme yeni ders ekle ve AI ile konuşarak dersin hocasını tasarla.'}
        </Body>
        <CourseDraftForm
          value={draft}
          onChange={setDraft}
          teacherOnly={teacherOnly}
          saving={busy}
          onSaveCharacter={() => persistCharacter(false)}
          onAddToWorld={() => persistCharacter(true)}
        />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  box: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 22, gap: 14, paddingBottom: 40 },
})
