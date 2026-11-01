import { getHealth } from '../../health.ts'
import { publicProcedure, router } from '../init.ts'

export const healthRouter = router({
  status: publicProcedure.query(async () => getHealth()),
})
