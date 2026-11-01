import { TRPCError } from '@trpc/server'

export function trpcFromUnknown(error: unknown): never {
  const message = error instanceof Error ? error.message : 'UNKNOWN'
  if (message === 'GEMINI_UNAVAILABLE') {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'GEMINI_UNAVAILABLE',
    })
  }
  if (message === 'GEMINI_INVALID') {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'GEMINI_INVALID' })
  }
  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: message.slice(0, 280),
  })
}
