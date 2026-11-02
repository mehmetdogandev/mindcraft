import { Pressable, StyleSheet, Text, View } from 'react-native'
import { findSlotClashes, type Weekday } from '@mindcraft/schedule'
import {
  REALMS,
  WEEKDAYS,
  type CourseDraft,
  type CourseSlotDraft,
  type RealmId,
} from '../lib/courses/draft.ts'
import { colors } from '../lib/theme.ts'
import { ConversationalCharacterCreator } from './ConversationalCharacterCreator.tsx'
import { Body, Button, Field } from './ui.tsx'

export function CourseDraftForm({
  value,
  onChange,
  teacherOnly,
  onSaveCharacter,
  onAddToWorld,
  saving,
}: {
  value: CourseDraft
  onChange: (next: CourseDraft) => void
  teacherOnly?: boolean
  onSaveCharacter?: () => void
  onAddToWorld?: () => void
  saving?: boolean
}) {
  const slots: CourseSlotDraft[] =
    value.slots && value.slots.length > 0
      ? value.slots
      : [{ weekday: value.weekday, startTime: value.startTime, endTime: value.endTime }]

  function patch(partial: Partial<CourseDraft>) {
    onChange({ ...value, ...partial })
  }

  function updateSlot(index: number, partial: Partial<CourseSlotDraft>) {
    const nextSlots = slots.map((s, i) => (i === index ? { ...s, ...partial } : s))
    const first = nextSlots[0] ?? { weekday: 1, startTime: '09:00', endTime: '11:00' }
    patch({
      slots: nextSlots,
      weekday: first.weekday,
      startTime: first.startTime,
      endTime: first.endTime,
    })
  }

  function addSlot() {
    const nextSlots = [...slots, { weekday: 3, startTime: '13:00', endTime: '15:00' }]
    patch({ slots: nextSlots })
  }

  function removeSlot(index: number) {
    if (slots.length <= 1) return
    const nextSlots = slots.filter((_, i) => i !== index)
    const first = nextSlots[0]
    patch({
      slots: nextSlots,
      weekday: first.weekday,
      startTime: first.startTime,
      endTime: first.endTime,
    })
  }

  const clashes = findSlotClashes(
    slots.map((s, i) => ({
      key: String(i),
      weekday: s.weekday as Weekday,
      startTime: s.startTime,
      endTime: s.endTime,
    }))
  )

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
          <Body>Haftalık ders oturumları</Body>
          {slots.map((slot, index) => (
            <View
              key={index}
              style={[styles.slotCard, clashes.has(String(index)) && styles.slotCardClash]}
            >
              <View style={styles.slotHeader}>
                <Text style={styles.slotTitle}>Oturum {index + 1}</Text>
                {slots.length > 1 ? (
                  <Pressable onPress={() => removeSlot(index)}>
                    <Text style={styles.removeLink}>Kaldır</Text>
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.row}>
                {WEEKDAYS.map((day) => (
                  <Chip
                    key={day.value}
                    label={day.label}
                    active={slot.weekday === day.value}
                    onPress={() => updateSlot(index, { weekday: day.value })}
                  />
                ))}
              </View>
              <View style={styles.timeRow}>
                <Field
                  placeholder="Başlangıç 09:00"
                  value={slot.startTime}
                  onChangeText={(startTime) => updateSlot(index, { startTime })}
                  style={styles.halfField}
                />
                <Field
                  placeholder="Bitiş 11:00"
                  value={slot.endTime}
                  onChangeText={(endTime) => updateSlot(index, { endTime })}
                  style={styles.halfField}
                />
              </View>
              <Field
                placeholder="Sınıf / Amfi / Lab (opsiyonel)"
                value={slot.room ?? ''}
                onChangeText={(room) => updateSlot(index, { room })}
              />
            </View>
          ))}
          {clashes.size > 0 ? (
            <Text style={styles.clashWarn}>
              Uyarı: Bu dersin oturum saatleri kendi içinde çakışıyor!
            </Text>
          ) : null}
          <Button ghost label="+ Başka gün/saat ekle" onPress={addSlot} />
        </>
      )}

      <ConversationalCharacterCreator
        title="AI Hoca Tasarım Stüdyosu"
        initialPrompt={value.teacherPrompt}
        appearance={value.teacherAppearance}
        onChange={({ appearance, lastPrompt }) => {
          patch({
            teacherAppearance: appearance,
            teacherPrompt: lastPrompt || value.teacherPrompt || 'Akademik profesör',
          })
        }}
        onSaveCharacter={onSaveCharacter}
        onAddToWorld={onAddToWorld}
        saving={saving}
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
  timeRow: { flexDirection: 'row', gap: 8 },
  halfField: { flex: 1 },
  slotCard: {
    gap: 8,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#13072e',
    borderWidth: 1,
    borderColor: colors.border,
  },
  slotCardClash: {
    borderColor: colors.danger,
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slotTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  removeLink: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 12,
  },
  clashWarn: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
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
