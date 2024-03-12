import * as flags from 'std/flags/mod.ts'

import { isHttpError } from 'std/http/http_errors.ts'
import { gray, red, yellow } from 'std/fmt/colors.ts'

import { appConfig } from './config.ts'
import { syncRepo } from './git.ts'
import {
  cleanStack,
  createDebug,
  getBearer,
  ioQueue,
  pickHttpColor,
  prettySearch,
} from './lib.ts'
import { expandRoute } from './expand.ts'
import { queryRoute } from './query.ts'
import { writeFileRoute } from './write.ts'
import { webhookRoute } from './webhook.ts'
import { changedRoute } from './changed.ts'
import { defineRoute, DenoRouter } from 'gruber/mod.ts'

const debug = createDebug('server')

debug('start port=%o sync=%o', appConfig.port, appConfig.git.pull)

const indexRoute = defineRoute({
  method: 'GET',
  pathname: '/',
  handler() {
    return Response.json({ app: appConfig.meta })
  },
})

const healthRoute = defineRoute({
  method: 'GET',
  pathname: '/healthz',
  handler() {
    return new Response('ok')
  },
})

const routes = [
  indexRoute,
  healthRoute,
  queryRoute,
  writeFileRoute,
  expandRoute,
  webhookRoute,
  changedRoute,
]

if (appConfig.git.pull) {
  debug('sync t=%o', appConfig.git.syncInterval)
  await ioQueue.add(() => syncRepo())
  setInterval(
    () => ioQueue.add(() => syncRepo()),
    appConfig.git.syncInterval,
  )
}

if (import.meta.main) {
  const router = new DenoRouter({ routes })
  Deno.serve({ port: appConfig.port }, router.forDenoServe())
}
