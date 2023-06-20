import * as path from 'std/path/mod.ts'
import * as fs from 'std/fs/mod.ts'
import { Context, repoDir, userPath } from './lib.ts'

export async function expandRoute({ request, url }: Context) {
  if (request.method !== 'GET') return

  const glob = url.searchParams.get('glob')

  if (glob) {
    console.debug('list glob %o', glob)

    const globUrl = userPath(glob)
    const paths: string[] = []
    for await (const match of fs.expandGlob(globUrl)) {
      if (!match.isFile) continue
      paths.push(path.relative(repoDir.pathname, match.path))
    }

    return Response.json(paths)
  }
}
