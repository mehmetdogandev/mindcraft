import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateQuestXP,
  calculateLevel,
  updateSkillScores,
  validateEnergyMatrix,
  runAlgorithmSequence,
} from './rules.ts'

test('XP calculation awards base XP and resilience bonus on perseverance', () => {
  const firstTrySuccess = calculateQuestXP({
    isCorrect: true,
    score: 100,
    attemptsUsed: 1,
    hintsUsed: 0,
    timeSpentSeconds: 30,
  })
  assert.equal(firstTrySuccess, 150)

  const resilientSuccess = calculateQuestXP({
    isCorrect: true,
    score: 80,
    attemptsUsed: 3,
    hintsUsed: 1,
    timeSpentSeconds: 60,
  })
  assert.equal(resilientSuccess, 165)

  const learningAttempt = calculateQuestXP({
    isCorrect: false,
    score: 0,
    attemptsUsed: 2,
    hintsUsed: 0,
    timeSpentSeconds: 45,
  })
  assert.equal(learningAttempt, 80)
})

test('Level progression scales and updates titles', () => {
  const lvl1 = calculateLevel(0)
  assert.equal(lvl1.level, 1)
  assert.equal(lvl1.title, 'Zihin Çırağı')

  const lvl2 = calculateLevel(160)
  assert.equal(lvl2.level, 2)
  assert.equal(lvl2.title, 'Merak Yolcusu')
})

test('Energy matrix validator checks active node sums', () => {
  const nodes = [
    { id: '1', value: 12, active: true },
    { id: '2', value: 8, active: true },
    { id: '3', value: 5, active: false },
    { id: '4', value: 4, active: true },
  ]
  const result = validateEnergyMatrix(nodes, 24)
  assert.equal(result.valid, true)
  assert.equal(result.currentSum, 24)
  assert.equal(result.difference, 0)

  const failResult = validateEnergyMatrix(nodes, 30)
  assert.equal(failResult.valid, false)
  assert.equal(failResult.difference, 6)
})

test('Algorithm sequence navigation correctly guides robot to target', () => {
  const gridSize = { width: 4, height: 4 }
  const startPos = { x: 0, y: 0, dir: 'E' as const }
  const target = { x: 2, y: 1 }
  const obstacles = [{ x: 1, y: 0 }]
  const path: Array<'MOVE' | 'TURN_LEFT' | 'TURN_RIGHT'> = [
    'TURN_RIGHT',
    'MOVE',
    'TURN_LEFT',
    'MOVE',
    'MOVE',
  ]

  const run = runAlgorithmSequence(gridSize, startPos, path, obstacles, target)
  assert.equal(run.success, true)
  assert.equal(run.reachedTarget, true)
  assert.equal(run.crashed, false)
})

test('Skill scores grow by realm and reward resilience after mistakes', () => {
  const next = updateSkillScores(
    {
      logic: 10,
      creativity: 10,
      resilience: 10,
      criticalThinking: 10,
      knowledge: 10,
      communication: 10,
    },
    'math',
    { isCorrect: false, score: 0, attemptsUsed: 2, hintsUsed: 0, timeSpentSeconds: 20 }
  )
  assert.equal(next.logic, 11)
  assert.equal(next.resilience, 12)
})
