import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native'
import { colors } from '../lib/theme.ts'

export function Title({ children }: { children: string }) {
  return <Text style={styles.title}>{children}</Text>
}

export function Body({ children }: { children: string }) {
  return <Text style={styles.body}>{children}</Text>
}

export function Field(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.muted} style={styles.input} {...props} />
}

export function Button({
  label,
  onPress,
  disabled,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
}) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.btn, disabled && { opacity: 0.5 }]}>
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  )
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  body: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  input: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    color: colors.text,
    paddingHorizontal: 14,
  },
  btn: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  btnText: { color: colors.accentText, fontWeight: '700', fontSize: 16 },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
})
