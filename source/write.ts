import { red } from 'std/fmt/colors.ts'
import * as fs from 'std/fs/mod.ts'
import * as path from 'std/path/mod.ts'

import { appConfig } from './config.ts'
import { GitRepo, syncRepo } from './git.ts'
import {
  BadRequest,
  Context,
  createDebug,
  ioQueue,
  MethodNotAllowed,
  repoDir,
  userPath,
} from './lib.ts'

const debug = createDebug('write')

export function createFileRoute({ request, url }: Context) {
  if (request.method !== 'PUT') throw new MethodNotAllowed()

  const repo = new GitRepo(repoDir, request.signal)
  const message = url.searchParams.get('message') ?? 'automated commit'
  const file = url.searchParams.get('file')

  if (!file) throw new BadRequest('?file not set')
  if (!request.body) throw new BadRequest('No body to parse')

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

      const stage = await repo.stage(file)
      debug('stage', stage.ok)

      const commit = await repo.commit('repo-api-service: ' + message)
      debug('commit', commit.ok)
      if (appConfig.git.push) {
        const push = await repo.push()
        debug('push', push.ok)
      } else {
        debug('skip push')
      }

      return Response.json('ok')
    } catch (error) {
      console.error(red('create file failed'), error)

      const reset = await repo.rollback(rollbackSha)
      if (!reset.ok) console.error('reset failed', reset.stdout)

      const clean = await repo.clean()
      if (!clean.ok) console.error('clean failed', clean.stderr)

      throw new BadRequest(error.message)
    }
  })
}
