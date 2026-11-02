export const SPRITE_FRAME = 240 as const

export const SPRITE_ANIMATIONS = [
  'idle',
  'talk',
  'think',
  'happy',
  'confused',
  'celebrate',
  'walk',
] as const

export type SpriteAnimation = (typeof SPRITE_ANIMATIONS)[number]

export const MVP_ANIMATIONS = [
  'idle',
  'talk',
  'think',
  'happy',
  'confused',
  'celebrate',
] as const

export const NPC_FACES = ['round', 'oval', 'square'] as const
export type NpcFace = (typeof NPC_FACES)[number]

export const NPC_HAIR_COLORS = ['blonde', 'black', 'brown', 'gray'] as const
export type NpcHairColor = (typeof NPC_HAIR_COLORS)[number]

export const NPC_HAIR_STYLES = ['straight', 'wavy', 'curly', 'long'] as const
export type NpcHairStyle = (typeof NPC_HAIR_STYLES)[number]

export const NPC_GLASSES = ['round', 'square', 'none'] as const
export type NpcGlasses = (typeof NPC_GLASSES)[number]

export const NPC_OUTFITS = ['suit', 'coat', 'casual'] as const
export type NpcOutfit = (typeof NPC_OUTFITS)[number]

export type NpcAppearance = {
  face: NpcFace
  hair: NpcHairColor
  hairStyle: NpcHairStyle
  glasses: NpcGlasses
  outfit: NpcOutfit
}

export type CharacterAppearanceSpec = {
  face: NpcFace
  hairColor: NpcHairColor
  hairStyle: NpcHairStyle
  glasses: NpcGlasses
}

export type CharacterConfiguration = {
  profession: string
  appearance: CharacterAppearanceSpec
  outfit: NpcOutfit
}

export type CharacterOperation = 'CREATE_CHARACTER' | 'UPDATE_CHARACTER'

export type CharacterPatchChanges = {
  profession?: string
  appearance?: Partial<{
    face: NpcFace
    hairColor: NpcHairColor
    hair: NpcHairColor
    hairStyle: NpcHairStyle
    glasses: NpcGlasses
    outfit: NpcOutfit
  }>
  outfit?: NpcOutfit
}

export type CharacterPatch = {
  operation: CharacterOperation
  changes: CharacterPatchChanges
  unsupportedAttributes?: string[]
  reply?: string
}

export type CharacterChatTurn = {
  role: 'user' | 'assistant'
  text: string
}

export type CharacterUpdateResult = {
  operation: CharacterOperation
  configuration: CharacterConfiguration
  appearance: NpcAppearance
  patch: CharacterPatch
  appliedChanges: string[]
  unsupportedAttributes: string[]
  reply: string
}

export type SpriteSheetManifest = {
  characterId: string
  frameWidth: number
  frameHeight: number
  artSource?: 'npc_layers' | 'placeholder' | 'generated'
  npc?: NpcAppearance
  animations: Partial<
    Record<
      SpriteAnimation,
      {
        file: string
        url?: string
        frames: number
        fps: number
        loop: boolean
      }
    >
  >
}

export type CharacterKind = 'avatar' | 'mentor'
export type CharacterStatus = 'generating' | 'preview' | 'ready' | 'failed'
export type SkeletonHint = 'humanoid' | 'creature' | 'robot'

export type CharacterProfile = {
  name: string
  title?: string
  species?: string
  appearance: NpcAppearance & Record<string, unknown>
  personality: string
  teachingStyle: string
  catchphrase?: string
  backstory?: string
  welcomeMessage?: string
  skeletonHint: SkeletonHint
}

export type MentorChatResponse = {
  message: string
  emotion: string
  animation: SpriteAnimation
  nextAction: 'wait_for_student' | 'open_whiteboard' | 'start_quest'
  learningObjective: string
  socraticHint?: string
}

export function mapEmotionToAnimation(emotion: string): SpriteAnimation {
  const raw = emotion.trim().toLowerCase()
  if (raw === 'surprise' || raw === 'surprised') return 'happy'
  if (raw === 'confuse' || raw === 'confused') return 'confused'
  if (raw === 'celebrate' || raw === 'happy') return raw === 'celebrate' ? 'celebrate' : 'happy'
  if (raw === 'think' || raw === 'thinking') return 'think'
  if (raw === 'talk' || raw === 'idle' || raw === 'walk') return raw as SpriteAnimation
  return 'talk'
}

function hashText(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

function pickRandom<T>(items: readonly T[], rng: () => number = Math.random): T {
  const idx = Math.min(items.length - 1, Math.max(0, Math.floor(rng() * items.length)))
  return items[idx]
}

export function toCharacterConfiguration(
  npc: NpcAppearance,
  profession = 'academic'
): CharacterConfiguration {
  return {
    profession,
    appearance: {
      face: npc.face,
      hairColor: npc.hair,
      hairStyle: npc.hairStyle,
      glasses: npc.glasses,
    },
    outfit: npc.outfit,
  }
}

export function fromCharacterConfiguration(config: CharacterConfiguration): NpcAppearance {
  return {
    face: config.appearance.face,
    hair: config.appearance.hairColor,
    hairStyle: config.appearance.hairStyle,
    glasses: config.appearance.glasses,
    outfit: config.outfit,
  }
}

export function isValidFace(val: unknown): val is NpcFace {
  return typeof val === 'string' && (NPC_FACES as readonly string[]).includes(val)
}

export function isValidHairColor(val: unknown): val is NpcHairColor {
  return typeof val === 'string' && (NPC_HAIR_COLORS as readonly string[]).includes(val)
}

export function isValidHairStyle(val: unknown): val is NpcHairStyle {
  return typeof val === 'string' && (NPC_HAIR_STYLES as readonly string[]).includes(val)
}

export function isValidGlasses(val: unknown): val is NpcGlasses {
  return typeof val === 'string' && (NPC_GLASSES as readonly string[]).includes(val)
}

export function isValidOutfit(val: unknown): val is NpcOutfit {
  return typeof val === 'string' && (NPC_OUTFITS as readonly string[]).includes(val)
}

/**
 * Runtime schema validator for character patches.
 * Strips any unknown or unsupported asset IDs so invalid values never corrupt character state.
 */
export function validateCharacterPatch(raw: unknown): CharacterPatch {
  if (!raw || typeof raw !== 'object') {
    return { operation: 'UPDATE_CHARACTER', changes: {} }
  }
  const obj = raw as Record<string, unknown>
  const operation: CharacterOperation =
    obj.operation === 'CREATE_CHARACTER' ? 'CREATE_CHARACTER' : 'UPDATE_CHARACTER'

  const rawChanges =
    obj.changes && typeof obj.changes === 'object' ? (obj.changes as Record<string, unknown>) : obj
  const rawAppearance =
    rawChanges.appearance && typeof rawChanges.appearance === 'object'
      ? (rawChanges.appearance as Record<string, unknown>)
      : rawChanges

  const validatedAppearance: NonNullable<CharacterPatchChanges['appearance']> = {}

  if (isValidFace(rawAppearance.face)) {
    validatedAppearance.face = rawAppearance.face
  }
  const rawHairColor = rawAppearance.hairColor ?? rawAppearance.hair
  if (isValidHairColor(rawHairColor)) {
    validatedAppearance.hairColor = rawHairColor
    validatedAppearance.hair = rawHairColor
  }
  if (isValidHairStyle(rawAppearance.hairStyle)) {
    validatedAppearance.hairStyle = rawAppearance.hairStyle
  }
  if (rawAppearance.glasses === null || rawAppearance.glasses === 'none') {
    validatedAppearance.glasses = 'none'
  } else if (isValidGlasses(rawAppearance.glasses)) {
    validatedAppearance.glasses = rawAppearance.glasses
  }

  const rawOutfit = rawChanges.outfit ?? rawAppearance.outfit
  let validatedOutfit: NpcOutfit | undefined
  if (isValidOutfit(rawOutfit)) {
    validatedOutfit = rawOutfit
    validatedAppearance.outfit = rawOutfit
  }

  const profession =
    typeof rawChanges.profession === 'string' && rawChanges.profession.trim()
      ? rawChanges.profession.trim()
      : typeof obj.profession === 'string' && obj.profession.trim()
        ? obj.profession.trim()
        : undefined

  const unsupportedAttributes = Array.isArray(obj.unsupportedAttributes)
    ? obj.unsupportedAttributes.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    : undefined

  const reply = typeof obj.reply === 'string' && obj.reply.trim() ? obj.reply.trim() : undefined

  return {
    operation,
    changes: {
      ...(profession ? { profession } : {}),
      ...(Object.keys(validatedAppearance).length > 0 ? { appearance: validatedAppearance } : {}),
      ...(validatedOutfit ? { outfit: validatedOutfit } : {}),
    },
    ...(unsupportedAttributes && unsupportedAttributes.length > 0 ? { unsupportedAttributes } : {}),
    ...(reply ? { reply } : {}),
  }
}

export function foldTurkishAscii(input: string): string {
  return input
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/i̇/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/â/g, 'a')
    .replace(/î/g, 'i')
    .replace(/û/g, 'u')
}

const UNSUPPORTED_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /(cowboy hat|kovboy sapka)/i, label: 'kovboy şapkası' },
  { pattern: /(\bhat\b|\bcap\b|\bbeanie\b|\bberet\b|\bhelmet\b|\bcrown\b|sapka|\bbere\b|kasket|\btac\b|\bkask\b|fotr)/i, label: 'şapka/başlık' },
  { pattern: /(\bbeard\b|\bmustache\b|\bmoustache\b|\bgoatee\b|sakal|biyik)/i, label: 'sakal/bıyık' },
  { pattern: /(\bbald\b|shaved head|no hair|\bkel\b|sacsiz|dazlak)/i, label: 'saçsız/kel görünüm' },
  { pattern: /(red hair|ginger hair|blue hair|green hair|pink hair|purple hair|kizil sac|mavi sac|yesil sac|pembe sac|mor sac|turuncu sac)/i, label: 'bu saç rengi' },
  { pattern: /(\bscarf\b|\batki\b|fular)/i, label: 'atkı' },
  { pattern: /(\bearring\b|\bearrings\b|\bpiercing\b|kupe)/i, label: 'küpe/piercing' },
  { pattern: /(\btattoo\b|dovme)/i, label: 'dövme' },
  { pattern: /(\bsunglasses\b|gunes gozlug)/i, label: 'güneş gözlüğü' },
  { pattern: /(\bheadphones\b|\bheadset\b|kulaklik)/i, label: 'kulaklık' },
]

export function detectUnsupportedAttributes(prompt: string): string[] {
  const text = foldTurkishAscii(prompt)
  const found: string[] = []
  for (const item of UNSUPPORTED_PATTERNS) {
    if (item.pattern.test(text) && !found.includes(item.label)) {
      found.push(item.label)
    }
  }
  return found
}

/**
 * Extracts ONLY explicitly mentioned attributes from a natural language prompt (Turkish, ASCII-Turkish & English).
 * Unmentioned attributes are left undefined so callers can distinguish between explicit and unspecified traits.
 */
export function extractExplicitAttributes(prompt: string): {
  profession?: string
  face?: NpcFace
  hairColor?: NpcHairColor
  hairStyle?: NpcHairStyle
  glasses?: NpcGlasses
  outfit?: NpcOutfit
  unsupportedAttributes: string[]
  isRandomizeRequest: boolean
  isNewCharacterRequest: boolean
} {
  const text = foldTurkishAscii(prompt).trim()
  const unsupportedAttributes = detectUnsupportedAttributes(text)

  const isRandomizeRequest =
    /(surprise me|random|randomize|new character|another character|start over|fresh character|surpriz|rastgele|yeni bir karakter|farkli bir karakter|bastan|sifirdan)/.test(
      text
    )

  const isNewCharacterRequest =
    isRandomizeRequest ||
    /^(create|generate|design|make me a|build a|bir\s+.*\s*(olustur|tasarla|yap)|yeni\s+)/i.test(text)

  let profession: string | undefined
  if (/(professor|academic|teacher|lecturer|scientist|mentor|profesor|akademisyen|hoca|ogretmen|docent|doktor)/.test(text)) {
    profession = 'academic'
  }

  // Face extraction (avoid matching "square glasses" or "round glasses")
  const textWithoutGlasses = text
    .replace(/(square|round|circular|rectangular|boxy|kare|yuvarlak|koseli|dikdortgen)\s*(glasses|frames|spectacles|gozluk|gozluklu)/g, ' ')

  let face: NpcFace | undefined
  if (/(square face|angular face|sharp face|kare yuz|koseli yuz|keskin yuz|sert yuz|\bkare\b|\bsquare\b|\bkoseli\b)/.test(textWithoutGlasses)) {
    face = 'square'
  } else if (/(oval face|long face|thin face|slim face|oval yuz|ince yuz|uzun yuz|\boval\b)/.test(textWithoutGlasses)) {
    face = 'oval'
  } else if (/(round face|chubby|soft face|yuvarlak yuz|tombul|sevimli|\byuvarlak\b|\bround\b)/.test(textWithoutGlasses)) {
    face = 'round'
  }

  // Strip clothing color phrases like "black suit", "white coat", "gray suit" before checking hair color
  const textWithoutOutfitColor = text.replace(
    /(black|white|gray|grey|brown|dark|blue|siyah|beyaz|gri|kahve|kahverengi|koyu|lacivert)\s+(suit|coat|lab coat|jacket|blazer|tie|outfit|clothes|dress|shirt|sweater|takim|takim elbise|ceket|onluk|palto|pardosu|kiyafet|elbise|kazak|tisort|hirka)/g,
    '$2'
  )

  let hairColor: NpcHairColor | undefined
  const hasUnsupportedHairColor = /(red hair|ginger hair|blue hair|green hair|pink hair|purple hair|kizil sac|mavi sac|yesil sac|pembe sac|mor sac|turuncu sac)/.test(
    text
  )
  if (!hasUnsupportedHairColor) {
    if (/(blonde|blond|yellow|golden|fair hair|sarisin|sari sac|\bsari\b|altin|acik sac)/.test(textWithoutOutfitColor)) {
      hairColor = 'blonde'
    } else if (/(gray|grey|white hair|silver|gri sac|\bgri\b|beyaz sac|ak sac|kir sac|\bkir\b|yasli|bilge|gumus)/.test(textWithoutOutfitColor)) {
      hairColor = 'gray'
    } else if (/(brown hair|brunette|chestnut|\bbrown\b|kahverengi|kahve sac|\bkahve\b|kumral|kestane|karamel)/.test(textWithoutOutfitColor)) {
      hairColor = 'brown'
    } else if (/(black hair|dark hair|raven|\bblack\b|siyah sac|\bsiyah\b|kara sac|koyu sac|esmer)/.test(textWithoutOutfitColor)) {
      hairColor = 'black'
    }
  }

  let hairStyle: NpcHairStyle | undefined
  const hasBaldRequest = /(\bbald\b|shaved head|no hair|\bkel\b|sacsiz|dazlak)/.test(text)
  if (!hasBaldRequest) {
    if (/(curly|afro|frizzy|kivircik|kabarik|bukle)/.test(text)) {
      hairStyle = 'curly'
    } else if (/(wavy|dalgali|dalga)/.test(text)) {
      hairStyle = 'wavy'
    } else if (/(long hair|shoulder length|uzun sac|omuz|\buzun\b(?!\s*yuz|\s*boylu)|\blong\b(?!\s*face|\s*coat))/.test(text)) {
      hairStyle = 'long'
    } else if (/(straight|short hair|duz sac|\bduz\b|kisa sac|\bkisa\b(?!\s*boylu)|\bshort\b(?!\s*stature))/.test(text)) {
      hairStyle = 'straight'
    }
  }

  let glasses: NpcGlasses | undefined
  if (
    /(remove.*glasses|no glasses|without glasses|take off.*glasses|ditch.*glasses|lose.*glasses|glasses off|gozlugu cikar|gozlugunu cikar|gozlukleri cikar|gozlugu kaldir|gozlugunu kaldir|cikar gozlug|gozluksuz|gozluk yok|gozluk olmasin|gozluk istemiyorum|gozluk takmasin|\bnone\b)/.test(
      text
    )
  ) {
    glasses = 'none'
  } else if (/(square glasses|rectangular glasses|boxy glasses|kare gozluk|koseli gozluk|dikdortgen gozluk|kemik gozluk)/.test(text)) {
    glasses = 'square'
  } else if (
    /(round glasses|circular glasses|wearing glasses|with glasses|add glasses|put on glasses|\bglasses\b|yuvarlak gozluk|gozluklu|gozluk tak|gozluk ekle|gozluk olsun|\bgozluk\b)/.test(
      text
    ) &&
    !/(sunglasses|gunes gozlug)/.test(text)
  ) {
    glasses = 'round'
  }

  let outfit: NpcOutfit | undefined
  if (/(lab coat|white coat|\bcoat\b|overcoat|trench|robe|onluk|onluklu|laboratuvar|beyaz onluk|palto|pardosu|cubbe)/.test(text)) {
    outfit = 'coat'
  } else if (/(casual|sweater|t-shirt|shirt|hoodie|sporty|relaxed|rahat|gunluk|spor|kazak|tisort|hirka|sweat|sivil)/.test(text)) {
    outfit = 'casual'
  } else if (/(\bsuit\b|formal|blazer|tuxedo|tie|jacket|takim elbise|takim elbiseli|\btakim\b|ceket|kravat|resmi|klasik)/.test(text)) {
    outfit = 'suit'
  }

  return {
    profession,
    face,
    hairColor,
    hairStyle,
    glasses,
    outfit,
    unsupportedAttributes,
    isRandomizeRequest,
    isNewCharacterRequest,
  }
}

export function buildCharacterPatchFromPrompt(
  prompt: string,
  hasExistingCharacter: boolean
): CharacterPatch {
  const extracted = extractExplicitAttributes(prompt)
  const operation: CharacterOperation =
    !hasExistingCharacter || extracted.isRandomizeRequest || extracted.isNewCharacterRequest
      ? 'CREATE_CHARACTER'
      : 'UPDATE_CHARACTER'

  const appearance: NonNullable<CharacterPatchChanges['appearance']> = {}
  if (extracted.face) appearance.face = extracted.face
  if (extracted.hairColor) {
    appearance.hairColor = extracted.hairColor
    appearance.hair = extracted.hairColor
  }
  if (extracted.hairStyle) appearance.hairStyle = extracted.hairStyle
  if (extracted.glasses) appearance.glasses = extracted.glasses
  if (extracted.outfit) appearance.outfit = extracted.outfit

  return validateCharacterPatch({
    operation,
    changes: {
      ...(extracted.profession ? { profession: extracted.profession } : {}),
      ...(Object.keys(appearance).length > 0 ? { appearance } : {}),
      ...(extracted.outfit ? { outfit: extracted.outfit } : {}),
    },
    unsupportedAttributes: extracted.unsupportedAttributes,
  })
}

const FACE_TR: Record<NpcFace, string> = {
  round: 'yuvarlak yüz hatları',
  oval: 'oval yüz hatları',
  square: 'köşeli yüz hatları',
}

const HAIR_COLOR_TR: Record<NpcHairColor, string> = {
  blonde: 'sarı',
  black: 'siyah',
  brown: 'kahverengi',
  gray: 'kır/gri',
}

const HAIR_STYLE_TR: Record<NpcHairStyle, string> = {
  straight: 'düz',
  wavy: 'dalgalı',
  curly: 'kıvırcık',
  long: 'uzun',
}

const GLASSES_TR: Record<NpcGlasses, string> = {
  round: 'yuvarlak gözlük',
  square: 'kare gözlük',
  none: 'gözlüksüz görünüm',
}

const OUTFIT_TR: Record<NpcOutfit, string> = {
  suit: 'takım elbise',
  coat: 'akademik önlük/palto',
  casual: 'rahat günlük kıyafet',
}

/**
 * Applies a validated `CREATE_CHARACTER` or `UPDATE_CHARACTER` patch to the current character state.
 * - `CREATE_CHARACTER`: Keeps explicitly requested attributes and randomizes all unspecified attributes.
 * - `UPDATE_CHARACTER`: Applies ONLY explicitly requested attributes; preserves every unrelated attribute.
 */
export function applyCharacterPatch(
  current: NpcAppearance | CharacterConfiguration | null | undefined,
  rawPatch: CharacterPatch,
  rng: () => number = Math.random
): CharacterUpdateResult {
  const patch = validateCharacterPatch(rawPatch)
  const existingNpc: NpcAppearance | null = current
    ? 'appearance' in current
      ? fromCharacterConfiguration(current)
      : current
    : null
  const existingProfession =
    current && 'profession' in current && current.profession ? current.profession : 'academic'

  const changesApp = patch.changes.appearance ?? {}
  const explicitFace = changesApp.face
  const explicitHair = changesApp.hairColor ?? changesApp.hair
  const explicitHairStyle = changesApp.hairStyle
  const explicitGlasses = changesApp.glasses
  const explicitOutfit = patch.changes.outfit ?? changesApp.outfit
  const unsupported = patch.unsupportedAttributes ?? []

  const appliedChanges: string[] = []
  let nextNpc: NpcAppearance

  if (patch.operation === 'CREATE_CHARACTER' || !existingNpc) {
    nextNpc = {
      face: explicitFace ?? pickRandom(NPC_FACES, rng),
      hair: explicitHair ?? pickRandom(NPC_HAIR_COLORS, rng),
      hairStyle: explicitHairStyle ?? pickRandom(NPC_HAIR_STYLES, rng),
      glasses: explicitGlasses ?? pickRandom(NPC_GLASSES, rng),
      outfit: explicitOutfit ?? pickRandom(NPC_OUTFITS, rng),
    }
    if (explicitFace) appliedChanges.push('face')
    if (explicitHair) appliedChanges.push('hairColor')
    if (explicitHairStyle) appliedChanges.push('hairStyle')
    if (explicitGlasses) appliedChanges.push('glasses')
    if (explicitOutfit) appliedChanges.push('outfit')
  } else {
    nextNpc = {
      face: explicitFace ?? existingNpc.face,
      hair: explicitHair ?? existingNpc.hair,
      hairStyle: explicitHairStyle ?? existingNpc.hairStyle,
      glasses: explicitGlasses ?? existingNpc.glasses,
      outfit: explicitOutfit ?? existingNpc.outfit,
    }
    if (explicitFace && explicitFace !== existingNpc.face) appliedChanges.push('face')
    else if (explicitFace) appliedChanges.push('face')
    if (explicitHair && explicitHair !== existingNpc.hair) appliedChanges.push('hairColor')
    else if (explicitHair) appliedChanges.push('hairColor')
    if (explicitHairStyle && explicitHairStyle !== existingNpc.hairStyle) appliedChanges.push('hairStyle')
    else if (explicitHairStyle) appliedChanges.push('hairStyle')
    if (explicitGlasses && explicitGlasses !== existingNpc.glasses) appliedChanges.push('glasses')
    else if (explicitGlasses) appliedChanges.push('glasses')
    if (explicitOutfit && explicitOutfit !== existingNpc.outfit) appliedChanges.push('outfit')
    else if (explicitOutfit) appliedChanges.push('outfit')
  }

  const profession = patch.changes.profession ?? existingProfession
  const configuration = toCharacterConfiguration(nextNpc, profession)

  let reply = patch.reply ?? ''
  if (!reply) {
    const unsupportedNote =
      unsupported.length > 0
        ? `Şu anda ${unsupported.join(', ')} detayı desteklenmiyor; mevcut karakter görünümünü korudum.`
        : ''

    if (patch.operation === 'CREATE_CHARACTER' || !existingNpc) {
      const desc = `${FACE_TR[nextNpc.face]}, ${HAIR_STYLE_TR[nextNpc.hairStyle]} ${HAIR_COLOR_TR[nextNpc.hair]} saç, ${GLASSES_TR[nextNpc.glasses]} ve ${OUTFIT_TR[nextNpc.outfit]}`
      reply = unsupportedNote
        ? `${unsupportedNote} Karakterin ${desc} ile oluşturuldu.`
        : `Karakterin tasarlandı: ${desc}. Değiştirmek istediğin bir detay varsa yazabilirsin.`
    } else if (appliedChanges.length === 0 && unsupportedNote) {
      reply = unsupportedNote
    } else if (appliedChanges.length > 0) {
      const parts: string[] = []
      if (explicitFace) parts.push(FACE_TR[nextNpc.face])
      if (explicitHair) parts.push(`${HAIR_COLOR_TR[nextNpc.hair]} saç rengi`)
      if (explicitHairStyle) parts.push(`${HAIR_STYLE_TR[nextNpc.hairStyle]} saç modeli`)
      if (explicitGlasses) parts.push(GLASSES_TR[nextNpc.glasses])
      if (explicitOutfit) parts.push(OUTFIT_TR[nextNpc.outfit])
      const updateText = `Güncellendi: ${parts.join(', ')} uygulandı; diğer tüm özellikler korundu.`
      reply = unsupportedNote ? `${unsupportedNote} ${updateText}` : updateText
    } else {
      reply =
        'Mevcut karakter görünümü korundu. Saç rengi, saç modeli, yüz tipi, gözlük veya kıyafet için istediğin değişikliği yazabilirsin.'
    }
  }

  return {
    operation: patch.operation,
    configuration,
    appearance: nextNpc,
    patch,
    appliedChanges,
    unsupportedAttributes: unsupported,
    reply,
  }
}

/**
 * Processes a conversational turn locally (or merges an AI patch) while strictly enforcing
 * the CREATE_CHARACTER / UPDATE_CHARACTER rules.
 */
export function runConversationalCharacterTurn(input: {
  prompt: string
  currentAppearance?: NpcAppearance | null
  rng?: () => number
}): CharacterUpdateResult {
  const hasExisting = Boolean(input.currentAppearance)
  const patch = buildCharacterPatchFromPrompt(input.prompt, hasExisting)
  return applyCharacterPatch(input.currentAppearance, patch, input.rng)
}

export function parseDescriptionToNpcAppearance(prompt: string, seed = 0): NpcAppearance {
  const text = prompt.toLocaleLowerCase('tr-TR')
  const h = hashText(`${text}:${seed}`)
  const extracted = extractExplicitAttributes(text)

  const face: NpcFace = extracted.face ?? NPC_FACES[h % NPC_FACES.length]
  const hair: NpcHairColor = extracted.hairColor ?? NPC_HAIR_COLORS[(h >> 2) % NPC_HAIR_COLORS.length]
  const hairStyle: NpcHairStyle = extracted.hairStyle ?? NPC_HAIR_STYLES[(h >> 4) % NPC_HAIR_STYLES.length]
  const glasses: NpcGlasses = extracted.glasses ?? NPC_GLASSES[(h >> 6) % NPC_GLASSES.length]
  const outfit: NpcOutfit = extracted.outfit ?? NPC_OUTFITS[(h >> 8) % NPC_OUTFITS.length]

  return { face, hair, hairStyle, glasses, outfit }
}

export function normalizeNpcAppearance(raw: unknown, fallbackPrompt = ''): NpcAppearance {
  const base = parseDescriptionToNpcAppearance(fallbackPrompt)
  if (!raw || typeof raw !== 'object') return base
  const obj = raw as Record<string, unknown>
  const nested =
    obj.appearance && typeof obj.appearance === 'object'
      ? (obj.appearance as Record<string, unknown>)
      : obj

  const face = isValidFace(nested.face) ? nested.face : base.face
  const rawHair = nested.hairColor ?? nested.hair ?? obj.hairColor ?? obj.hair
  const hair = isValidHairColor(rawHair) ? rawHair : base.hair
  const hairStyle = isValidHairStyle(nested.hairStyle) ? nested.hairStyle : base.hairStyle
  const rawGlasses = nested.glasses ?? obj.glasses
  const glasses =
    rawGlasses === null || rawGlasses === 'none'
      ? 'none'
      : isValidGlasses(rawGlasses)
        ? rawGlasses
        : base.glasses
  const rawOutfit = obj.outfit ?? nested.outfit
  const outfit = isValidOutfit(rawOutfit) ? rawOutfit : base.outfit
  return { face, hair, hairStyle, glasses, outfit }
}

export function defaultManifest(
  characterId: string,
  urls: Partial<Record<SpriteAnimation, string>>,
  artSource: 'npc_layers' | 'placeholder' | 'generated' = 'npc_layers',
  npc?: NpcAppearance
): SpriteSheetManifest {
  const animations: SpriteSheetManifest['animations'] = {}
  for (const name of SPRITE_ANIMATIONS) {
    const url = urls[name] ?? `local://npc/${characterId}/${name}`
    animations[name] = {
      file: `${name}.png`,
      url,
      frames: 1,
      fps: 8,
      loop: name !== 'celebrate',
    }
  }
  return {
    characterId,
    frameWidth: SPRITE_FRAME,
    frameHeight: SPRITE_FRAME,
    artSource,
    npc,
    animations,
  }
}
