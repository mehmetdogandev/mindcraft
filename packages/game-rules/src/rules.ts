export interface SkillScores {
  logic: number
  creativity: number
  resilience: number
  criticalThinking: number
  knowledge: number
  communication: number
}

export interface UserStats {
  xp: number
  level: number
  streakDays: number
  questsCompleted: number
  mistakesEmbraced: number
  skills: SkillScores
}

export interface QuestResult {
  isCorrect: boolean
  score: number
  attemptsUsed: number
  hintsUsed: number
  timeSpentSeconds: number
  explanationQualityScore?: number
}

export const EMPTY_SKILLS: SkillScores = {
  logic: 0,
  creativity: 0,
  resilience: 0,
  criticalThinking: 0,
  knowledge: 0,
  communication: 0,
}

export function calculateQuestXP(result: QuestResult): number {
  let baseXP = 50

  if (result.isCorrect) {
    baseXP += 100
  } else {
    baseXP += 30
  }

  const hintPenalty = Math.min(result.hintsUsed * 10, 30)
  baseXP = Math.max(20, baseXP - hintPenalty)

  if (result.attemptsUsed > 1 && result.isCorrect) {
    baseXP += 25
  }

  if (result.explanationQualityScore) {
    baseXP += Math.round(result.explanationQualityScore * 0.4)
  }

  return baseXP
}

export const LEVEL_TITLES = [
  'Zihin Çırağı',
  'Merak Yolcusu',
  'Kavram Kâşifi',
  'Bağlantı Ustası',
  'Mantık Mimarı',
  'Evren Kâşifi',
  'Felsefe Bilgesi',
  'Mindcraft Kozmik Üstadı',
] as const

export function calculateLevel(xp: number): {
  level: number
  currentLevelXP: number
  nextLevelXP: number
  title: string
} {
  let lvl = 1
  let remainingXP = Math.max(0, xp)
  let needed = 150

  while (remainingXP >= needed) {
    remainingXP -= needed
    lvl++
    needed = Math.round(150 * Math.pow(1.25, lvl - 1))
  }

  const titleIndex = Math.min(lvl - 1, LEVEL_TITLES.length - 1)

  return {
    level: lvl,
    currentLevelXP: remainingXP,
    nextLevelXP: needed,
    title: LEVEL_TITLES[titleIndex],
  }
}

export function updateSkillScores(
  current: SkillScores,
  realmId: string,
  result: QuestResult
): SkillScores {
  const next = { ...current }
  const gain = result.isCorrect ? 3 : 1

  switch (realmId) {
    case 'math':
      next.logic = Math.min(100, next.logic + gain)
      next.criticalThinking = Math.min(100, next.criticalThinking + Math.ceil(gain / 2))
      break
    case 'science':
      next.criticalThinking = Math.min(100, next.criticalThinking + gain)
      next.knowledge = Math.min(100, next.knowledge + gain)
      break
    case 'code':
      next.logic = Math.min(100, next.logic + gain)
      next.creativity = Math.min(100, next.creativity + Math.ceil(gain / 2))
      break
    case 'history':
      next.criticalThinking = Math.min(100, next.criticalThinking + gain)
      next.communication = Math.min(100, next.communication + Math.ceil(gain / 2))
      break
    case 'language':
      next.communication = Math.min(100, next.communication + gain)
      next.creativity = Math.min(100, next.creativity + Math.ceil(gain / 2))
      break
    case 'finance':
      next.criticalThinking = Math.min(100, next.criticalThinking + gain)
      next.logic = Math.min(100, next.logic + Math.ceil(gain / 2))
      break
    default:
      next.knowledge = Math.min(100, next.knowledge + gain)
  }

  if (result.attemptsUsed > 1 || !result.isCorrect) {
    next.resilience = Math.min(100, next.resilience + 2)
  }

  return next
}

export function validateEnergyMatrix(
  nodes: { id: string; value: number; active: boolean }[],
  targetSum: number
): { valid: boolean; currentSum: number; difference: number } {
  const currentSum = nodes.filter((n) => n.active).reduce((acc, n) => acc + n.value, 0)
  const difference = targetSum - currentSum
  return { valid: difference === 0, currentSum, difference }
}

export function runAlgorithmSequence(
  gridSize: { width: number; height: number },
  startPos: { x: number; y: number; dir: 'N' | 'E' | 'S' | 'W' },
  instructions: ('MOVE' | 'TURN_LEFT' | 'TURN_RIGHT')[],
  obstacles: { x: number; y: number }[],
  target: { x: number; y: number }
): {
  success: boolean
  finalPos: { x: number; y: number; dir: string }
  crashed: boolean
  reachedTarget: boolean
} {
  let { x, y, dir } = startPos
  const directions: Array<'N' | 'E' | 'S' | 'W'> = ['N', 'E', 'S', 'W']

  for (const cmd of instructions) {
    if (cmd === 'TURN_LEFT') {
      dir = directions[(directions.indexOf(dir) + 3) % 4]
    } else if (cmd === 'TURN_RIGHT') {
      dir = directions[(directions.indexOf(dir) + 1) % 4]
    } else if (cmd === 'MOVE') {
      let nx = x
      let ny = y
      if (dir === 'N') ny -= 1
      if (dir === 'S') ny += 1
      if (dir === 'E') nx += 1
      if (dir === 'W') nx -= 1

      if (nx < 0 || nx >= gridSize.width || ny < 0 || ny >= gridSize.height) {
        return { success: false, finalPos: { x, y, dir }, crashed: true, reachedTarget: false }
      }
      if (obstacles.some((o) => o.x === nx && o.y === ny)) {
        return { success: false, finalPos: { x: nx, y: ny, dir }, crashed: true, reachedTarget: false }
      }
      x = nx
      y = ny
    }
  }

  const reachedTarget = x === target.x && y === target.y
  return { success: reachedTarget, finalPos: { x, y, dir }, crashed: false, reachedTarget }
}
