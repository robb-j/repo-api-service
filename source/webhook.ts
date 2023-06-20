import { syncRepo } from './git.ts'
import { Context, ioQueue, MethodNotAllowed } from './lib.ts'

// EXPERIMENTAL
export async function webhookRoute({ request, url }: Context) {
  if (request.method !== 'GET') throw new MethodNotAllowed()

  // TODO: authenticate request ?

  const promise = ioQueue.add(() => syncRepo())
  if (url.searchParams.has('wait')) await promise

  return new Response('ok')
}
