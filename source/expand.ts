import * as fs from 'std/fs/mod.ts'
import * as path from 'std/path/mod.ts'
import {
  BadRequest,
  Context,
  MethodNotAllowed,
  repoDir,
  userPath,
} from './lib.ts'

export async function expandRoute({ request, url }: Context) {
  if (request.method !== 'GET') throw new MethodNotAllowed()

  const glob = url.searchParams.get('glob')

  if (glob) {
    const globUrl = userPath(glob)
    const paths: string[] = []
    for await (const match of fs.expandGlob(globUrl)) {
      if (!match.isFile) continue
      paths.push(path.relative(repoDir.pathname, match.path))
    }

    return Response.json(paths)
  }

  throw new BadRequest('Unsupported parameters')
}
