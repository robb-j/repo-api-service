import 'std/dotenv/load.ts'

import * as flags from 'std/flags/mod.ts'

import { Endpoint, ioQueue, SYNC_INTERVAL, syncRepo } from './lib.ts'
import { queryRoute } from './query.ts'
import { createFileRoute } from './write.ts'
import app from '../app.json' assert { type: 'json' }

const args = flags.parse(Deno.args, {
  string: ['port'],
  boolean: ['sync'],
  default: {
    port: '8000',
  },
})

function indexRoute() {
  return Response.json({ app })
}
function healthRoute() {
  return new Response('ok')
}

const endpoints: Endpoint[] = [
  { pattern: new URLPattern({ pathname: '/' }), fn: indexRoute },
  { pattern: new URLPattern({ pathname: '/healthz' }), fn: healthRoute },
  { pattern: new URLPattern({ pathname: '/query' }), fn: queryRoute },
  { pattern: new URLPattern({ pathname: '/file' }), fn: createFileRoute },
]

if (args.sync) {
  await ioQueue.add(() => syncRepo())
  setTimeout(() => ioQueue.add(() => syncRepo()), SYNC_INTERVAL)
}

Deno.serve({ port: parseInt(args.port) }, async (request) => {
  try {
    const url = new URL(request.url)

    if (!url.pathname.startsWith('/healthz')) {
      console.info('%s: %o', request.method, url.pathname)
    }

    for (const endpoint of endpoints) {
      const match = endpoint.pattern.exec(url)
      if (!match) continue
      const params = match.pathname.groups as Record<string, string>
      const response = await endpoint.fn({ url, request, params })
      if (response instanceof Response) return response
    }

    return new Response('Not found', { status: 404 })
  } catch (error) {
    console.error('Internal error', error)
    return new Response('Internal Error', { status: 500 })
  }
})
