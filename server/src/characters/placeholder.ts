import { defaultManifest, MVP_ANIMATIONS, type SpriteAnimation } from '@mindcraft/sprites'

function svgFor(color: string, accent: string, label: string, pose: string) {
  const eyeY = pose === 'think' ? 108 : 100
  const mouth = pose === 'celebrate' || pose === 'happy' ? 'M95 150 Q128 175 161 150' : pose === 'confused' ? 'M100 155 Q128 145 156 155' : 'M100 150 Q128 162 156 150'
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <rect width="256" height="256" fill="none"/>
  <circle cx="128" cy="118" r="62" fill="${color}"/>
  <circle cx="108" cy="${eyeY}" r="8" fill="#111827"/>
  <circle cx="148" cy="${eyeY}" r="8" fill="#111827"/>
  <path d="${mouth}" fill="none" stroke="#111827" stroke-width="6" stroke-linecap="round"/>
  <rect x="86" y="176" width="84" height="48" rx="16" fill="${accent}"/>
  <text x="128" y="246" text-anchor="middle" font-size="16" fill="#e5e7eb" font-family="sans-serif">${label}</text>
</svg>`
}

export function buildPlaceholderAssets(input: {
  characterId: string
  name: string
  primaryColor: string
  accentColor: string
  apiPublicUrl: string
}) {
  const files: Record<string, string> = {}
  const urls: Partial<Record<SpriteAnimation, string>> = {}
  for (const anim of MVP_ANIMATIONS) {
    files[`${anim}.svg`] = svgFor(input.primaryColor, input.accentColor, input.name, anim)
    urls[anim] = `${input.apiPublicUrl}/api/files/characters/${input.characterId}/${anim}.svg`
  }
  return {
    files,
    manifest: defaultManifest(input.characterId, urls, 'placeholder'),
  }
}
