import { useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CourseDraftForm } from '../components/CourseDraftForm.tsx'
import { BrandMark } from '../components/BrandMark.tsx'
import { Body, Button, Card, Field, Title } from '../components/ui.tsx'
import { defaultOnboardingCourses, newCourseDraft, type CourseDraft } from '../lib/courses/draft.ts'
import { saveCourseWithTeacher } from '../lib/courses/save.ts'
import { trpc } from '../lib/api/trpc.ts'
import { colors } from '../lib/theme.ts'

const roles = ['student', 'graduate', 'worker', 'independent'] as const

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const [role, setRole] = useState<(typeof roles)[number]>('student')
  const [displayName, setDisplayName] = useState('')
  const [schoolName, setSchoolName] = useState('')
  const [department, setDepartment] = useState('')
  const [termName, setTermName] = useState('2026 Güz')
  const [startDate, setStartDate] = useState('2026-09-15')
  const [endDate, setEndDate] = useState('2027-01-15')
  const [courses, setCourses] = useState<CourseDraft[]>(defaultOnboardingCourses)
  const [busy, setBusy] = useState(false)

  const readyCourses = courses.filter((c) => c.name.trim() && (c.teacherPrompt.trim() || c.teacherAppearance))

  function updateCourse(key: string, next: CourseDraft) {
    setCourses((prev) => prev.map((item) => (item.key === key ? next : item)))
  }

  async function finish() {
    if (readyCourses.length === 0) {
      Alert.alert('Dersler', 'En az bir ders ve o dersin öğretmen tarifini yaz.')
      return
    }
    setBusy(true)
    try {
      await trpc().onboarding.commit.mutate({
        confirmations: [`Rol: ${role}`, `Ad: ${displayName}`, `Ders: ${readyCourses.length}`],
        learnerRole: role,
        displayName: displayName || 'Kâşif',
        timezone: 'Europe/Istanbul',
        schoolName,
        department,
      })
      const term = await trpc().calendar.terms.upsert.mutate({
        name: termName,
        startDate,
        endDate,
        activate: true,
      })
      for (const [index, draft] of readyCourses.entries()) {
        await saveCourseWithTeacher(draft, term.id, index)
      }
      onDone()
    } catch (error) {
      Alert.alert('Kurulum', error instanceof Error ? error.message : 'Kurulum kaydedilemedi')
    } finally {
      setBusy(false)
    }
  }

  return (
    <SafeAreaView style={styles.box}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <BrandMark size={64} />
        <Title>Tanışma</Title>
        {step === 0 ? (
          <>
            <Body>Kısa bir kimlik seçimiyle öğrenme evrenini kuralım.</Body>
            <Field placeholder="Adın" value={displayName} onChangeText={setDisplayName} />
            {roles.map((item) => (
              <Button key={item} label={item} ghost={role !== item} onPress={() => setRole(item)} />
            ))}
            <Button label="Devam" onPress={() => setStep(1)} />
          </>
        ) : null}
        {step === 1 ? (
          <>
            <Body>Dönemi yaz. Dersleri ve hocalarını bir sonraki adımda tasarlayacaksın.</Body>
            {role === 'student' ? (
              <>
                <Field placeholder="Okul" value={schoolName} onChangeText={setSchoolName} />
                <Field placeholder="Bölüm" value={department} onChangeText={setDepartment} />
              </>
            ) : null}
            <Field placeholder="Dönem adı" value={termName} onChangeText={setTermName} />
            <Field placeholder="Başlangıç YYYY-MM-DD" value={startDate} onChangeText={setStartDate} />
            <Field placeholder="Bitiş YYYY-MM-DD" value={endDate} onChangeText={setEndDate} />
            <Button label="Derslere ve Hocalara Geç" onPress={() => setStep(2)} />
          </>
        ) : null}
        {step === 2 ? (
          <>
            <Body>
              Her dersin hocasını doğal dille tarif et; AI ile sohbet ederek karakterini adım adım şekillendirebilirsin.
            </Body>
            {courses.map((course, index) => (
              <Card key={course.key}>
                <Text style={styles.cardKicker}>Ders {index + 1}</Text>
                <CourseDraftForm value={course} onChange={(next) => updateCourse(course.key, next)} />
                {courses.length > 1 ? (
                  <Button
                    ghost
                    label="Bu dersi çıkar"
                    onPress={() => setCourses((prev) => prev.filter((item) => item.key !== course.key))}
                  />
                ) : null}
              </Card>
            ))}
            <Button ghost label="Başka ders ekle" onPress={() => setCourses((prev) => [...prev, newCourseDraft()])} />
            <Button
              disabled={busy || readyCourses.length === 0}
              label={busy ? 'Öğretmenler hazırlanıyor…' : `${readyCourses.length} ders ve hoca ile başla`}
              onPress={finish}
            />
            <Button ghost label="Döneme dön" onPress={() => setStep(1)} />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  box: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 22, gap: 12, paddingBottom: 40 },
  cardKicker: { color: colors.accent, fontWeight: '800', textTransform: 'uppercase', fontSize: 12 },
})
