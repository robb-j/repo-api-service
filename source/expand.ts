import { defineRoute, HTTPError } from 'gruber/mod.ts'
import * as fs from 'std/fs/mod.ts'
import * as path from 'std/path/mod.ts'

import { assertAuth, createDebug, repoDir, userPath } from './lib.ts'

const debug = createDebug('expand')

export const expandRoute = defineRoute({
  method: 'GET',
  pathname: '/expand',
  async handler({ request, url }) {
    assertAuth(request)

    const glob = url.searchParams.get('glob')

    if (glob) {
      debug('glob=%o', glob)
      const globUrl = userPath(glob)
      const paths: string[] = []
      for await (const match of fs.expandGlob(globUrl)) {
        if (!match.isFile) continue
        paths.push(path.relative(repoDir.pathname, match.path))
      }

      debug('paths', paths)

      return Response.json(paths)
    }

    throw HTTPError.badRequest('Unsupported parameters')
  },
})
