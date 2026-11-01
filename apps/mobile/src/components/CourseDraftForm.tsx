import { Pressable, StyleSheet, Text, View } from 'react-native'
import { REALMS, WEEKDAYS, type CourseDraft, type RealmId } from '../lib/courses/draft.ts'
import { colors } from '../lib/theme.ts'
import { Body, Field } from './ui.tsx'

export function CourseDraftForm({
  value,
  onChange,
  teacherOnly,
}: {
  value: CourseDraft
  onChange: (next: CourseDraft) => void
  teacherOnly?: boolean
}) {
  function patch(partial: Partial<CourseDraft>) {
    onChange({ ...value, ...partial })
  }

  return (
    <View style={styles.wrap}>
      {teacherOnly ? null : (
        <>
          <Field placeholder="Ders adı" value={value.name} onChangeText={(name) => patch({ name })} />
          <Body>Evren</Body>
          <View style={styles.row}>
            {REALMS.map((realm) => (
              <Chip
                key={realm}
                label={realm}
                active={value.realmId === realm}
                onPress={() => patch({ realmId: realm as RealmId })}
              />
            ))}
          </View>
          <Body>Haftalık saat</Body>
          <View style={styles.row}>
            {WEEKDAYS.map((day) => (
              <Chip
                key={day.value}
                label={day.label}
                active={value.weekday === day.value}
                onPress={() => patch({ weekday: day.value })}
              />
            ))}
          </View>
          <Field
            placeholder="Başlangıç SS:DD"
            value={value.startTime}
            onChangeText={(startTime) => patch({ startTime })}
          />
          <Field placeholder="Bitiş SS:DD" value={value.endTime} onChangeText={(endTime) => patch({ endTime })} />
        </>
      )}
      <Field
        placeholder="Bu dersin öğretmeni — tarif et"
        value={value.teacherPrompt}
        onChangeText={(teacherPrompt) => patch({ teacherPrompt })}
        multiline
        style={{ minHeight: 88, textAlignVertical: 'top' }}
      />
    </View>
  )
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipOn]}>
      <Text style={[styles.chipText, active && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.muted, fontWeight: '700', fontSize: 12 },
  chipTextOn: { color: colors.accentText },
})
