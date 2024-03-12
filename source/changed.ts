import { defineRoute, HTTPError } from 'gruber/mod.ts'

import { GitRepo, LogFilesOptions } from './git.ts'
import { assertAuth, createDebug, repoDir } from './lib.ts'

const debug = createDebug('changed')

export const changedRoute = defineRoute({
  method: 'GET',
  pathname: '/changed',
  async handler({ request, url }) {
    assertAuth(request)

    const repo = new GitRepo(repoDir, request.signal)

    const options: LogFilesOptions = {}
    options.since = url.searchParams.get('since') ?? undefined
    options.until = url.searchParams.get('until') ?? undefined
    options.paths = url.searchParams.getAll('paths')

    debug('options', options)

    const changes = await repo.logFiles(options)
    if (!changes.ok) throw HTTPError.internalServerError() // Failed to git-log

    debug('changed', changes.stdout)

    return Response.json(
      changes.stdout.split(/\n+/)
        .map((f) => f.trim())
        .filter((f) => Boolean(f)),
    )
  },
})
