import * as path from 'std/path/mod.ts'
import * as fs from 'std/fs/mod.ts'

import {
  Context,
  ioQueue,
  NO_PUSH,
  repoDir,
  syncRepo,
  userPath,
} from './lib.ts'
import { GitRepo } from './git.ts'

function failure(message: string) {
  return new Response(`query failed: ${message}`)
}

export function createFileRoute({ request, url }: Context) {
  if (request.method !== 'PUT') return

  const repo = new GitRepo(repoDir, request.signal)
  const message = url.searchParams.get('message') ?? 'automated commit'
  const file = url.searchParams.get('file')

  if (!file) return failure('?file not set')
  if (!request.body) return failure('No body to parse')

  console.debug('file %o', file)

  // Queue the IO operation so only 1 can happen at once
  return ioQueue.add(async () => {
    const currentCommit = await repo.head()
    const rollbackSha = currentCommit.stdout.trim()
    console.log('current sha=%o', rollbackSha)

    try {
      const fileUrl = userPath(file)

      await syncRepo(request.signal)

      // Ensure the directory exists...
      const fileDir = userPath(path.dirname(file))
      await fs.ensureDir(fileDir)

      const target = await Deno.open(fileUrl, { write: true, create: true })
      await request.body!.pipeTo(target.writable)

      await repo.stage(file)
      await repo.commit('repo-api-service: ' + message)
      if (!NO_PUSH) await repo.push()

      return Response.json('ok')
    } catch (error) {
      console.error('create file failed', error)

      const reset = await repo.rollback(rollbackSha)
      if (!reset.ok) console.error('reset failed', reset.stdout)

      const clean = await repo.clean()
      if (!clean.ok) console.error('clean failed', clean.stderr)

      return failure(error.message)
    }
  })
}
