export const SPRITE_FRAME = 256 as const

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

export type SpriteSheetManifest = {
  characterId: string
  frameWidth: number
  frameHeight: number
  artSource?: 'placeholder' | 'generated'
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
  appearance: string | Record<string, string>
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

export function defaultManifest(
  characterId: string,
  urls: Partial<Record<SpriteAnimation, string>>,
  artSource: 'placeholder' | 'generated' = 'placeholder'
): SpriteSheetManifest {
  const animations: SpriteSheetManifest['animations'] = {}
  for (const name of SPRITE_ANIMATIONS) {
    const url = urls[name]
    if (!url) continue
    animations[name] = {
      file: `${name}.svg`,
      url,
      frames: name === 'talk' ? 8 : 6,
      fps: name === 'talk' ? 12 : 8,
      loop: name !== 'celebrate',
    }
  }
  return {
    characterId,
    frameWidth: SPRITE_FRAME,
    frameHeight: SPRITE_FRAME,
    artSource,
    animations,
  }
}
