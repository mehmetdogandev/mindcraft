import { useState } from 'react'
import { Alert, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { trpc } from '../lib/api/trpc.ts'
import { colors } from '../lib/theme.ts'
import { BrandMark } from '../components/BrandMark.tsx'
import { Body, Button, Field, Title } from '../components/ui.tsx'

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
  const [courseName, setCourseName] = useState('Veri Yapıları')
  const [prompt, setPrompt] = useState('Mor pelerinli, esprili, sabırlı bir ejderha')
  const [busy, setBusy] = useState(false)

  async function finish() {
    setBusy(true)
    try {
      await trpc().onboarding.commit.mutate({
        confirmations: [`Rol: ${role}`, `Ad: ${displayName}`],
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
      const created = await trpc().calendar.courses.upsert.mutate({
        termId: term.id,
        name: courseName,
        realmId: 'code',
        source: 'academic',
        progressStatus: 'current',
      })
      await trpc().calendar.meetings.replace.mutate({
        courseId: created.id,
        slots: [
          { weekday: 1, startTime: '09:00', endTime: '11:00', label: courseName },
          { weekday: 1, startTime: '13:00', endTime: '15:00', label: 'Ayrık Matematik' },
        ],
      })
      await trpc().characters.create.mutate({
        kind: 'mentor',
        courseId: created.id,
        method: 'describe',
        prompt,
        skeletonHint: 'creature',
      })
      onDone()
    } catch (error) {
      Alert.alert('Kurulum', error instanceof Error ? error.message : 'AI veya sunucu kapalı olabilir')
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
            <Body>Anket değil, kısa bir kimlik. Gemini yoksa bu form yedektir.</Body>
            <Field placeholder="Adın" value={displayName} onChangeText={setDisplayName} />
            {roles.map((item) => (
              <Button key={item} label={item} onPress={() => setRole(item)} />
            ))}
            <Button label="Devam" onPress={() => setStep(1)} />
          </>
        ) : null}
        {step === 1 ? (
          <>
            <Body>Dönem ve ilk ders. Pazartesi senaryosu için iki saatlik iki oturum eklenir.</Body>
            {role === 'student' ? (
              <>
                <Field placeholder="Okul" value={schoolName} onChangeText={setSchoolName} />
                <Field placeholder="Bölüm" value={department} onChangeText={setDepartment} />
              </>
            ) : null}
            <Field placeholder="Dönem adı" value={termName} onChangeText={setTermName} />
            <Field placeholder="Başlangıç YYYY-MM-DD" value={startDate} onChangeText={setStartDate} />
            <Field placeholder="Bitiş YYYY-MM-DD" value={endDate} onChangeText={setEndDate} />
            <Field placeholder="İlk ders" value={courseName} onChangeText={setCourseName} />
            <Button label="Devam" onPress={() => setStep(2)} />
          </>
        ) : null}
        {step === 2 ? (
          <>
            <Body>İlk öğretmenini tarif et. Hazır olmadan evrene alınmazsın.</Body>
            <Field placeholder="Öğretmen tarifi" value={prompt} onChangeText={setPrompt} multiline />
            <Button disabled={busy} label={busy ? 'Üretiliyor…' : 'Öğretmeni yarat ve başla'} onPress={finish} />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  box: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 22, gap: 12 },
})
