import { createTRPCClient, httpBatchLink } from '@trpc/client'
import superjson from 'superjson'
import type { AppRouter } from '../../../../server/src/trpc/router.ts'
import { API_BASE_URL } from '../config.ts'
import { getToken } from '../auth/storage.ts'

export function trpc() {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${API_BASE_URL}/api/trpc`,
        transformer: superjson,
        async headers() {
          const token = await getToken()
          return token ? { authorization: `Bearer ${token}` } : {}
        },
      }),
    ],
  })
}
