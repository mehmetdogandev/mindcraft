import { isHHMM, minutesOf, timesOverlap } from './dates.ts'
import type { HHMM, Weekday } from './types.ts'

export type DraftSlot = {
  key: string
  weekday: Weekday
  startTime: HHMM
  endTime: HHMM
}

function validRange(start: HHMM, end: HHMM): boolean {
  return isHHMM(start) && isHHMM(end) && minutesOf(start) < minutesOf(end)
}

export function findSlotClashes(slots: readonly DraftSlot[]): Map<string, string[]> {
  const out = new Map<string, string[]>()
  const valid = slots.filter((s) => validRange(s.startTime, s.endTime))
  const push = (key: string, other: string) => {
    const list = out.get(key) ?? []
    list.push(other)
    out.set(key, list)
  }

  for (let i = 0; i < valid.length; i += 1) {
    for (let j = i + 1; j < valid.length; j += 1) {
      const a = valid[i]
      const b = valid[j]
      if (a.weekday === b.weekday && timesOverlap(a.startTime, a.endTime, b.startTime, b.endTime)) {
        push(a.key, b.key)
        push(b.key, a.key)
      }
    }
  }
  return out
}
