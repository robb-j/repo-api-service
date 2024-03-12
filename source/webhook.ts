import { defineRoute } from 'gruber/mod.ts'

import { syncRepo } from './git.ts'
import { assertAuth, ioQueue } from './lib.ts'

// EXPERIMENTAL
// TODO: authenticate request ?
export const webhookRoute = defineRoute({
  method: 'GET',
  pathname: '/webhook',
  async handler({ request, url }) {
    assertAuth(request)

    const promise = ioQueue.add(() => syncRepo())
    if (url.searchParams.has('wait')) await promise

    return new Response('ok')
  },
})
