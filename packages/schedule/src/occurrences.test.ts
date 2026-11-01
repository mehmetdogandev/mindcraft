import test from 'node:test'
import assert from 'node:assert/strict'
import { occurrencesOnDate } from './occurrences.ts'

test('monday meetings appear and cancellations hide them', () => {
  const meetings = [
    {
      id: 'm1',
      courseId: 'c1',
      weekday: 1 as const,
      startTime: '09:00',
      endTime: '11:00',
      room: null,
      label: 'Veri Yapıları',
    },
    {
      id: 'm2',
      courseId: 'c2',
      weekday: 1 as const,
      startTime: '13:00',
      endTime: '15:00',
      room: null,
      label: 'Ayrık Matematik',
    },
  ]

  const open = occurrencesOnDate('2026-11-02', meetings, [])
  assert.equal(open.length, 2)
  assert.equal(open[0].startTime, '09:00')
  assert.equal(open.every((o) => !o.cancelled), true)

  const cancelled = occurrencesOnDate('2026-11-02', meetings, [
    { id: 'e1', courseId: 'c1', date: '2026-11-02', kind: 'cancel' },
  ])
  assert.equal(cancelled.find((o) => o.courseId === 'c1')?.cancelled, true)
  assert.equal(cancelled.find((o) => o.courseId === 'c2')?.cancelled, false)
})
