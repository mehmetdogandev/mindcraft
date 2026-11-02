import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native'
import {
  normalizeNpcAppearance,
  type NpcAppearance,
  type NpcFace,
  type NpcGlasses,
  type NpcHairColor,
  type NpcHairStyle,
  type NpcOutfit,
  type SpriteAnimation,
} from '@mindcraft/sprites'
import { colors } from '../lib/theme.ts'

const npcAssets: Record<string, ImageSourcePropType> = {
  legs: require('../../assets/npc/legs.png'),
  shoes: require('../../assets/npc/shoes.png'),
  neck: require('../../assets/npc/neck.png'),
  face_round: require('../../assets/npc/face_round.png'),
  face_oval: require('../../assets/npc/face_oval.png'),
  face_square: require('../../assets/npc/face_square.png'),
  glasses_round: require('../../assets/npc/glasses_round.png'),
  glasses_square: require('../../assets/npc/glasses_square.png'),
  outfit_suit: require('../../assets/npc/outfit_suit.png'),
  outfit_coat: require('../../assets/npc/outfit_coat.png'),
  outfit_casual: require('../../assets/npc/outfit_casual.png'),
  hair_blonde: require('../../assets/npc/hair_blonde.png'),
  hair_black: require('../../assets/npc/hair_black.png'),
  hair_brown: require('../../assets/npc/hair_brown.png'),
  hair_gray: require('../../assets/npc/hair_gray.png'),
  hair_wavy_blonde: require('../../assets/npc/hair_wavy_blonde.png'),
  hair_wavy_black: require('../../assets/npc/hair_wavy_black.png'),
  hair_wavy_brown: require('../../assets/npc/hair_wavy_brown.png'),
  hair_wavy_gray: require('../../assets/npc/hair_wavy_gray.png'),
  hair_curly_blonde: require('../../assets/npc/hair_curly_blonde.png'),
  hair_curly_black: require('../../assets/npc/hair_curly_black.png'),
  hair_curly_brown: require('../../assets/npc/hair_curly_brown.png'),
  hair_curly_gray: require('../../assets/npc/hair_curly_gray.png'),
  hair_long_blonde: require('../../assets/npc/hair_long_blonde.png'),
  hair_long_black: require('../../assets/npc/hair_long_black.png'),
  hair_long_brown: require('../../assets/npc/hair_long_brown.png'),
  hair_long_gray: require('../../assets/npc/hair_long_gray.png'),
  hair_long_blonde_back: require('../../assets/npc/hair_long_blonde_back.png'),
  hair_long_black_back: require('../../assets/npc/hair_long_black_back.png'),
  hair_long_brown_back: require('../../assets/npc/hair_long_brown_back.png'),
  hair_long_gray_back: require('../../assets/npc/hair_long_gray_back.png'),
}

export type AcademicNPCProps = {
  face?: NpcFace
  hair?: NpcHairColor
  hairStyle?: NpcHairStyle
  glasses?: NpcGlasses
  outfit?: NpcOutfit
  appearance?: Partial<NpcAppearance> | Record<string, unknown>
  fallbackPrompt?: string
  animation?: SpriteAnimation | string
  size?: number
}

export function AcademicNPC({
  face,
  hair,
  hairStyle,
  glasses,
  outfit,
  appearance,
  fallbackPrompt = '',
  animation = 'idle',
  size = 160,
}: AcademicNPCProps) {
  const resolved = normalizeNpcAppearance(
    {
      ...(appearance ?? {}),
      ...(face ? { face } : {}),
      ...(hair ? { hair } : {}),
      ...(hairStyle ? { hairStyle } : {}),
      ...(glasses ? { glasses } : {}),
      ...(outfit ? { outfit } : {}),
    },
    fallbackPrompt
  )

  const hairKey =
    resolved.hairStyle === 'straight'
      ? `hair_${resolved.hair}`
      : `hair_${resolved.hairStyle}_${resolved.hair}`
  const backKey = resolved.hairStyle === 'long' ? `hair_long_${resolved.hair}_back` : null

  const layers = [
    backKey,
    'legs',
    'shoes',
    `outfit_${resolved.outfit}`,
    'neck',
    `face_${resolved.face}`,
    hairKey,
    resolved.glasses !== 'none' ? `glasses_${resolved.glasses}` : null,
  ].filter((item): item is string => Boolean(item))

  const auraColor =
    animation === 'celebrate' || animation === 'happy'
      ? colors.good
      : animation === 'think'
        ? '#01d4ff'
        : animation === 'confused'
          ? colors.warn
          : colors.border

  return (
    <View
      style={[
        styles.frame,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.18),
          borderColor: auraColor,
        },
      ]}
    >
      {layers.map((key) =>
        npcAssets[key] ? (
          <Image
            key={key}
            source={npcAssets[key]}
            resizeMode="stretch"
            style={[StyleSheet.absoluteFill, { width: size, height: size }]}
          />
        ) : null
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: '#1b0d38',
    borderWidth: 1.5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
})

export default AcademicNPC
