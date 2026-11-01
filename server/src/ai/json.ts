export function safeParseJson(rawText: string | undefined): Record<string, unknown> {
  if (!rawText) throw new Error('GEMINI_INVALID')
  let clean = rawText.trim()
  if (clean.startsWith('```json')) clean = clean.replace(/^```json\s*/, '').replace(/```\s*$/, '')
  else if (clean.startsWith('```')) clean = clean.replace(/^```\s*/, '').replace(/```\s*$/, '')
  try {
    const parsed = JSON.parse(clean)
    if (!parsed || typeof parsed !== 'object') throw new Error('GEMINI_INVALID')
    return parsed as Record<string, unknown>
  } catch {
    const match = rawText.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('GEMINI_INVALID')
    return JSON.parse(match[0]) as Record<string, unknown>
  }
}
