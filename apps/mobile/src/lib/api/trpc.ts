import { createLocalBackendClient } from '../../backend/router.ts'

const client = createLocalBackendClient()

export function trpc() {
  return client
}
