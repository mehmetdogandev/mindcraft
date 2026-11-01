import test from 'node:test'
import assert from 'node:assert/strict'
import { findSlotClashes } from './clash.ts'

test('overlapping slots on the same weekday clash', () => {
  const clashes = findSlotClashes([
    { key: 'a', weekday: 1, startTime: '09:00', endTime: '11:00' },
    { key: 'b', weekday: 1, startTime: '10:30', endTime: '12:00' },
  ])
  assert.equal(clashes.get('a')?.includes('b'), true)
})

test('adjacent slots do not clash', () => {
  const clashes = findSlotClashes([
    { key: 'a', weekday: 1, startTime: '09:00', endTime: '11:00' },
    { key: 'b', weekday: 1, startTime: '11:00', endTime: '13:00' },
  ])
  assert.equal(clashes.size, 0)
})
