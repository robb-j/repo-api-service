import { GitRepo, LogFilesOptions } from './git.ts'
import {
  Context,
  createDebug,
  InternalServerError,
  MethodNotAllowed,
  repoDir,
} from './lib.ts'

const debug = createDebug('changed')

export async function changedRoute({ request, url }: Context) {
  if (request.method !== 'GET') throw new MethodNotAllowed()

  const repo = new GitRepo(repoDir, request.signal)

  const options: LogFilesOptions = {}
  options.since = url.searchParams.get('since') ?? undefined
  options.until = url.searchParams.get('until') ?? undefined
  options.paths = url.searchParams.getAll('paths')

  debug('options', options)

  const changes = await repo.logFiles(options)
  if (!changes.ok) throw new InternalServerError('Failed to git-log')

  debug('changed', changes.stdout)

  return Response.json(
    Array.from(
      new Set(
        changes.stdout.split(/\n+/)
          .map((f) => f.trim())
          .filter((f) => Boolean(f)),
      ),
    ),
  )
}
