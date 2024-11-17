import { defineRoute, HTTPError } from 'gruber/mod.ts'

import { red } from 'std/fmt/colors.ts'
import * as fs from 'std/fs/mod.ts'
import * as path from 'std/path/mod.ts'

import { appConfig } from './config.ts'
import { GitRepo, syncRepo } from './git.ts'
import { assertAuth, createDebug, ioQueue, repoDir, userPath } from './lib.ts'

const debug = createDebug('write')

export const writeFileRoute = defineRoute({
  method: 'PUT',
  pathname: '/file',
  handler({ request, url }) {
    assertAuth(request)

    const repo = new GitRepo(repoDir, request.signal)
    const message = url.searchParams.get('message') ?? 'automated commit'
    const file = url.searchParams.get('file')

    if (!file) throw HTTPError.badRequest('?file not set')
    if (!request.body) throw HTTPError.badRequest('No body to parse')

    debug('scheduling')

    // Queue the IO operation so only 1 can happen at once
    return ioQueue.add(async () => {
      const currentCommit = await repo.head()
      const rollbackSha = currentCommit.stdout.trim()
      debug('current sha=%o', rollbackSha)

      try {
        const fileUrl = userPath(file)
        debug('file', fileUrl.pathname)

        const sync = await syncRepo(request.signal)
        debug('sync', sync?.ok)

        // Ensure the directory exists...
        const fileDir = userPath(path.dirname(file))
        await fs.ensureDir(fileDir)
        debug('folder(s) created')

        const target = await Deno.open(fileUrl, {
          write: true,
          create: true,
          truncate: true,
        })
        await request.body!.pipeTo(target.writable)
        debug('file written', request.body)

        if (!appConfig.git.commit) {
          debug('skip commit')
          return Response.json('ok')
        }

        const status = await repo.status()
        if (status.stdout.trim() === '') {
          debug('no change')
          return Response.json('no-change')
        }

        const stage = await repo.stage(file)
        debug('stage', stage.ok)

        const commit = await repo.commit(
          `${appConfig.git.commitPrefix}: ${message}`,
        )
        debug('commit', commit.ok)

        if (!appConfig.git.push) {
          debug('skip push')
          return Response.json('ok')
        }
        const push = await repo.push()
        debug('push', push.ok)

        return Response.json('ok')
      } catch (error) {
        console.error(red('create file failed'), error)

        const reset = await repo.rollback(rollbackSha)
        if (!reset.ok) console.error('reset failed', reset.stdout)

        const clean = await repo.clean()
        if (!clean.ok) console.error('clean failed', clean.stderr)

        throw HTTPError.badRequest(error.message)
      }
    })
  },
})
