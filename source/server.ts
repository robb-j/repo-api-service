import * as flags from 'std/flags/mod.ts'

import { isHttpError } from 'std/http/http_errors.ts'
import { gray, red, yellow } from 'std/fmt/colors.ts'

import app from '../app.json' assert { type: 'json' }
import { appConfig } from './config.ts'
import { syncRepo } from './git.ts'
import {
  cleanStack,
  Endpoint,
  getBearer,
  InternalServerError,
  ioQueue,
  NotFound,
  pickHttpColor,
  prettySearch,
  Unauthorized,
} from './lib.ts'
import { expandRoute } from './expand.ts'
import { queryRoute } from './query.ts'
import { createFileRoute } from './write.ts'
import { webhookRoute } from './webhook.ts'

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
  { pattern: new URLPattern({ pathname: '/expand' }), fn: expandRoute },
  { pattern: new URLPattern({ pathname: '/webhook' }), fn: webhookRoute },
]

if (args.sync) {
  console.debug('initial sync t=%d', appConfig.git.syncInterval)
  await ioQueue.add(() => syncRepo())
  setInterval(
    () => ioQueue.add(() => syncRepo()),
    appConfig.git.syncInterval,
  )
}

async function router(request: Request) {
  const url = new URL(request.url)

  if (appConfig.auth.key && getBearer(request.headers) !== appConfig.auth.key) {
    throw new Unauthorized()
  }

  for (const endpoint of endpoints) {
    const match = endpoint.pattern.exec(url)
    if (!match) continue
    const params = match.pathname.groups as Record<string, string>
    const response = await endpoint.fn({ url, request, params })
    if (response instanceof Response) return response
  }

  throw new NotFound()
}

function logger(request: Request, response: Response) {
  const url = new URL(request.url)
  console.info(
    '%s %s %s %s',
    pickHttpColor(response.status)(response.status.toString()),
    yellow(request.method),
    url.pathname,
    gray(prettySearch(url)),
  )
}

function handler(error: Error & { stack: string }) {
  const httpError = !isHttpError(error)
    ? new InternalServerError(error.message)
    : error

  if (error !== httpError) {
    console.error(red('Fatal error'))
    console.error(gray(cleanStack(error.stack)))
  }

  return new Response(httpError.message, {
    status: httpError.status,
  })
}

Deno.serve({ port: parseInt(args.port) }, async (request) => {
  const response = await router(request).catch(handler)
  logger(request, response)
  return response
})
