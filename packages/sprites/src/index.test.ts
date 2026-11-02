import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyCharacterPatch,
  normalizeNpcAppearance,
  NPC_FACES,
  NPC_GLASSES,
  NPC_HAIR_COLORS,
  NPC_HAIR_STYLES,
  NPC_OUTFITS,
  parseDescriptionToNpcAppearance,
  runConversationalCharacterTurn,
  validateCharacterPatch,
} from './index.ts'

test('parseDescriptionToNpcAppearance maps Turkish traits to NPC asset layers', () => {
  const npc = parseDescriptionToNpcAppearance(
    'Kıvırcık gri saçlı, kare gözlüklü, beyaz laboratuvar önlüklü, yuvarlak yüzlü hoca'
  )
  assert.equal(npc.hair, 'gray')
  assert.equal(npc.hairStyle, 'curly')
  assert.equal(npc.glasses, 'square')
  assert.equal(npc.outfit, 'coat')
  assert.equal(npc.face, 'round')

  const asciiNpc = runConversationalCharacterTurn({
    prompt: 'sarisin kivircik sacli gozluksuz onluklu',
    currentAppearance: null,
  })
  assert.equal(asciiNpc.appearance.hair, 'blonde')
  assert.equal(asciiNpc.appearance.hairStyle, 'curly')
  assert.equal(asciiNpc.appearance.glasses, 'none')
  assert.equal(asciiNpc.appearance.outfit, 'coat')
})

test('normalizeNpcAppearance preserves explicit layers and fills missing ones', () => {
  const npc = normalizeNpcAppearance(
    { hair: 'blonde', hairStyle: 'long', glasses: 'none' },
    'takım elbiseli kare yüzlü profesör'
  )
  assert.equal(npc.hair, 'blonde')
  assert.equal(npc.hairStyle, 'long')
  assert.equal(npc.glasses, 'none')
  assert.equal(npc.outfit, 'suit')
  assert.equal(npc.face, 'square')
})

test('Acceptance 1-5 & 9: Multi-turn conversation preserves previous attributes and applies only requested changes', () => {
  // 1. "Create a professor" -> all unspecified visual attributes are randomized from valid catalog
  let rngStep = 0
  const fakeRng = () => {
    rngStep = (rngStep + 1) % 7
    return rngStep / 7
  }

  const turn1 = runConversationalCharacterTurn({
    prompt: 'Create a professor',
    currentAppearance: null,
    rng: fakeRng,
  })
  assert.equal(turn1.operation, 'CREATE_CHARACTER')
  assert.equal(turn1.configuration.profession, 'academic')
  assert.ok(NPC_FACES.includes(turn1.appearance.face))
  assert.ok(NPC_HAIR_COLORS.includes(turn1.appearance.hair))
  assert.ok(NPC_HAIR_STYLES.includes(turn1.appearance.hairStyle))
  assert.ok(NPC_GLASSES.includes(turn1.appearance.glasses))
  assert.ok(NPC_OUTFITS.includes(turn1.appearance.outfit))

  // 2. "Make his hair blonde" -> only hair color changes
  const turn2 = runConversationalCharacterTurn({
    prompt: 'Make his hair blonde',
    currentAppearance: turn1.appearance,
  })
  assert.equal(turn2.operation, 'UPDATE_CHARACTER')
  assert.equal(turn2.appearance.hair, 'blonde')
  assert.equal(turn2.appearance.face, turn1.appearance.face)
  assert.equal(turn2.appearance.hairStyle, turn1.appearance.hairStyle)
  assert.equal(turn2.appearance.glasses, turn1.appearance.glasses)
  assert.equal(turn2.appearance.outfit, turn1.appearance.outfit)

  // 3. "Make it curly" -> hair style changes, blonde color remains
  const turn3 = runConversationalCharacterTurn({
    prompt: 'Make it curly',
    currentAppearance: turn2.appearance,
  })
  assert.equal(turn3.operation, 'UPDATE_CHARACTER')
  assert.equal(turn3.appearance.hairStyle, 'curly')
  assert.equal(turn3.appearance.hair, 'blonde')
  assert.equal(turn3.appearance.face, turn2.appearance.face)
  assert.equal(turn3.appearance.glasses, turn2.appearance.glasses)
  assert.equal(turn3.appearance.outfit, turn2.appearance.outfit)

  // 4. "Remove the glasses" -> glasses become none, others remain
  const turn4 = runConversationalCharacterTurn({
    prompt: 'Remove the glasses',
    currentAppearance: turn3.appearance,
  })
  assert.equal(turn4.operation, 'UPDATE_CHARACTER')
  assert.equal(turn4.appearance.glasses, 'none')
  assert.equal(turn4.appearance.hair, 'blonde')
  assert.equal(turn4.appearance.hairStyle, 'curly')
  assert.equal(turn4.appearance.face, turn3.appearance.face)
  assert.equal(turn4.appearance.outfit, turn3.appearance.outfit)

  // 5. "Give him a black suit" -> outfit changes to suit, hair remains blonde (not black!)
  const turn5 = runConversationalCharacterTurn({
    prompt: 'Give him a black suit',
    currentAppearance: turn4.appearance,
  })
  assert.equal(turn5.operation, 'UPDATE_CHARACTER')
  assert.equal(turn5.appearance.outfit, 'suit')
  assert.equal(turn5.appearance.hair, 'blonde')
  assert.equal(turn5.appearance.hairStyle, 'curly')
  assert.equal(turn5.appearance.glasses, 'none')
  assert.equal(turn5.appearance.face, turn4.appearance.face)
})

test('Acceptance 6: "Surprise me with a new character" triggers CREATE_CHARACTER randomization', () => {
  const initial = {
    face: 'round' as const,
    hair: 'blonde' as const,
    hairStyle: 'curly' as const,
    glasses: 'none' as const,
    outfit: 'suit' as const,
  }
  const surprised = runConversationalCharacterTurn({
    prompt: 'Surprise me with a new character',
    currentAppearance: initial,
    rng: () => 0.85,
  })
  assert.equal(surprised.operation, 'CREATE_CHARACTER')
  assert.notDeepEqual(surprised.appearance, initial)
})

test('Acceptance 7: Unsupported attribute preserves existing character and informs user', () => {
  const existing = {
    face: 'oval' as const,
    hair: 'blonde' as const,
    hairStyle: 'curly' as const,
    glasses: 'round' as const,
    outfit: 'suit' as const,
  }
  const result = runConversationalCharacterTurn({
    prompt: 'Give him a cowboy hat',
    currentAppearance: existing,
  })
  assert.equal(result.operation, 'UPDATE_CHARACTER')
  assert.deepEqual(result.appearance, existing)
  assert.ok(result.unsupportedAttributes.includes('kovboy şapkası'))
  assert.match(result.reply, /kovboy şapkası/i)

  // Also test runtime validation strips any hallucinated asset IDs
  const validated = validateCharacterPatch({
    operation: 'UPDATE_CHARACTER',
    changes: {
      appearance: {
        hairStyle: 'mohawk_neon',
        face: 'triangle',
      },
      outfit: 'space_armor',
    },
  })
  const applied = applyCharacterPatch(existing, validated)
  assert.deepEqual(applied.appearance, existing)
})

test('Acceptance 8 & 10: Saved character reloads identically and Turkish multi-turn conversation works offline', () => {
  const t1 = runConversationalCharacterTurn({
    prompt: 'Gözlüklü sarışın bir profesör oluştur',
    currentAppearance: null,
    rng: () => 0.2,
  })
  assert.equal(t1.operation, 'CREATE_CHARACTER')
  assert.equal(t1.appearance.hair, 'blonde')
  assert.equal(t1.appearance.glasses, 'round')

  const t2 = runConversationalCharacterTurn({
    prompt: 'Saçını dalgalı yap',
    currentAppearance: t1.appearance,
  })
  assert.equal(t2.operation, 'UPDATE_CHARACTER')
  assert.equal(t2.appearance.hairStyle, 'wavy')
  assert.equal(t2.appearance.hair, 'blonde')

  const t3 = runConversationalCharacterTurn({
    prompt: 'Gözlüğünü çıkar ve laboratuvar önlüğü giydir',
    currentAppearance: t2.appearance,
  })
  assert.equal(t3.operation, 'UPDATE_CHARACTER')
  assert.equal(t3.appearance.glasses, 'none')
  assert.equal(t3.appearance.outfit, 'coat')
  assert.equal(t3.appearance.hair, 'blonde')
  assert.equal(t3.appearance.hairStyle, 'wavy')

  const reloaded = normalizeNpcAppearance(JSON.parse(JSON.stringify(t3.appearance)))
  assert.deepEqual(reloaded, t3.appearance)
})
