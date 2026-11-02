import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import {
  normalizeNpcAppearance,
  runConversationalCharacterTurn,
  type CharacterChatTurn,
  type NpcAppearance,
} from '@mindcraft/sprites'
import { trpc } from '../lib/api/trpc.ts'
import { colors } from '../lib/theme.ts'
import { AcademicNPC } from './AcademicNPC.tsx'
import { Button, Field } from './ui.tsx'

export function ConversationalCharacterCreator({
  title = 'AI Karakter Stüdyosu',
  initialPrompt = '',
  appearance,
  onChange,
  onSaveCharacter,
  onAddToWorld,
  saveLabel = 'Karakteri Kaydet',
  addToWorldLabel = 'Oyun Dünyasına Ekle',
  saving = false,
}: {
  title?: string
  initialPrompt?: string
  appearance?: Partial<NpcAppearance>
  onChange: (next: { appearance: NpcAppearance; lastPrompt: string; history: CharacterChatTurn[] }) => void
  onSaveCharacter?: () => void
  onAddToWorld?: () => void
  saveLabel?: string
  addToWorldLabel?: string
  saving?: boolean
}) {
  const [currentAppearance, setCurrentAppearance] = useState<NpcAppearance | null>(() => {
    if (appearance && Object.keys(appearance).length > 0) {
      return normalizeNpcAppearance(appearance, initialPrompt)
    }
    return null
  })

  const [history, setHistory] = useState<CharacterChatTurn[]>(() => [
    {
      role: 'assistant',
      text: 'Karakterini doğal dille tarif et (ör. "Sarışın gözlüklü bir profesör oluştur"). Ardından "Saçını kıvırcık yap" veya "Gözlüğünü çıkar" diyerek AI ile adım adım güncelleyebilirsin.',
    },
  ])

  const [promptInput, setPromptInput] = useState(initialPrompt)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (appearance && Object.keys(appearance).length > 0) {
      setCurrentAppearance(normalizeNpcAppearance(appearance, initialPrompt))
    }
  }, [appearance, initialPrompt])

  async function analyzePromptWithAi(rawText: string): Promise<NpcAppearance | null> {
    const text = rawText.trim()
    if (!text) return currentAppearance
    setPromptInput('')

    const userTurn: CharacterChatTurn = { role: 'user', text }
    const nextHistory = [...history, userTurn]
    setHistory(nextHistory)
    setBusy(true)

    try {
      const result = await trpc().characters.converse.mutate({
        prompt: text,
        currentAppearance,
        history: nextHistory,
      })
      const updatedHistory: CharacterChatTurn[] = [
        ...nextHistory,
        { role: 'assistant', text: result.reply },
      ]
      setCurrentAppearance(result.appearance)
      setHistory(updatedHistory)
      onChange({
        appearance: result.appearance,
        lastPrompt: text,
        history: updatedHistory,
      })
      return result.appearance
    } catch {
      const localResult = runConversationalCharacterTurn({
        prompt: text,
        currentAppearance,
      })
      const updatedHistory: CharacterChatTurn[] = [
        ...nextHistory,
        { role: 'assistant', text: localResult.reply },
      ]
      setCurrentAppearance(localResult.appearance)
      setHistory(updatedHistory)
      onChange({
        appearance: localResult.appearance,
        lastPrompt: text,
        history: updatedHistory,
      })
      return localResult.appearance
    } finally {
      setBusy(false)
    }
  }

  async function handleActionWithPendingPrompt(callback?: () => void) {
    if (!callback) return
    if (promptInput.trim()) {
      await analyzePromptWithAi(promptInput)
    }
    callback()
  }

  return (
    <View style={styles.container}>
      <View style={styles.previewCard}>
        <AcademicNPC
          appearance={currentAppearance ?? undefined}
          fallbackPrompt={initialPrompt || 'profesör'}
          size={124}
        />
        <View style={styles.previewInfo}>
          <Text style={styles.studioTitle}>{title}</Text>
          <Text style={styles.studioSubtitle}>
            {busy
              ? 'AI mesajını analiz edip karakteri güncelliyor…'
              : currentAppearance
                ? 'Karakterin hazır. Sohbetten yeni komutlar yazarak görünümünü adım adım değiştirebilirsin.'
                : 'Hayalindeki karakteri yaz ve Gönder butonuna bas; AI senin için analiz edip tasarlasın.'}
          </Text>
        </View>
      </View>

      <View style={styles.chatBox}>
        {history.map((turn, index) => (
          <View
            key={index}
            style={[
              styles.bubble,
              turn.role === 'user' ? styles.userBubble : styles.assistantBubble,
            ]}
          >
            <Text style={turn.role === 'user' ? styles.userText : styles.assistantText}>
              {turn.text}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.inputSection}>
        <Field
          placeholder='Mesajını yaz ve Gönder’e bas (ör. "sarisin gozluklu profesor", "sacini kivircik yap")'
          value={promptInput}
          onChangeText={setPromptInput}
          multiline
          style={styles.promptField}
        />
        <Button
          disabled={busy || !promptInput.trim()}
          label={busy ? 'AI Analiz Ediyor…' : 'Gönder'}
          onPress={() => analyzePromptWithAi(promptInput)}
        />
      </View>

      {onSaveCharacter || onAddToWorld ? (
        <View style={styles.actionRow}>
          {onSaveCharacter ? (
            <View style={styles.actionBtn}>
              <Button
                ghost={Boolean(onAddToWorld)}
                disabled={saving || busy}
                label={saving ? 'Kaydediliyor…' : saveLabel}
                onPress={() => handleActionWithPendingPrompt(onSaveCharacter)}
              />
            </View>
          ) : null}
          {onAddToWorld ? (
            <View style={styles.actionBtn}>
              <Button
                disabled={saving || busy}
                label={saving ? 'Ekleniyor…' : addToWorldLabel}
                onPress={() => handleActionWithPendingPrompt(onAddToWorld)}
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#13072e',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 12,
  },
  previewInfo: {
    flex: 1,
    gap: 4,
  },
  studioTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 15,
  },
  studioSubtitle: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  chatBox: {
    backgroundColor: '#110629',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 10,
    gap: 8,
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    maxWidth: '92%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#2a1650',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  assistantText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  inputSection: {
    gap: 8,
  },
  promptField: {
    minHeight: 68,
    textAlignVertical: 'top',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
  },
})
