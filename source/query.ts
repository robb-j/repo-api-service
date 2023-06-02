import * as path from 'std/path/mod.ts'
import * as fs from 'std/fs/mod.ts'
import * as yaml from 'std/yaml/mod.ts'
import * as csv from 'std/csv/mod.ts'
import * as frontMatter from 'std/front_matter/any.ts'
import * as toml from 'std/toml/mod.ts'

import { Context, repoDir, userPath } from './lib.ts'

export interface ProcessFileOptions {
  columns?: string[]
}

/** Load the file at the end of the provided URL and attempt to parse it into the provided type */
export async function processFile(
  fileUrl: string | URL,
  format: string,
  { columns }: ProcessFileOptions,
) {
  if (format === 'json') {
    return JSON.parse(await Deno.readTextFile(fileUrl))
  }
  if (format === 'yaml') {
    return yaml.parse(await Deno.readTextFile(fileUrl))
  }
  if (format === 'csv') {
    return csv.parse(await Deno.readTextFile(fileUrl), { columns })
  }
  if (format === 'markdown') {
    return frontMatter.extract(await Deno.readTextFile(fileUrl))
  }
  if (format === 'toml') {
    return toml.parse(await Deno.readTextFile(fileUrl))
  }
  if (format !== 'binary') {
    throw new Error(`Unknown type '${format}'`)
  }

  return null
}

export async function queryRoute({ request, url }: Context) {
  if (request.method !== 'GET') return

  const format = url.searchParams.get('format') ?? 'binary'
  const file = url.searchParams.get('file')
  const glob = url.searchParams.get('glob')
  const columns = url.searchParams.get('columns')?.split(',')

  // Process single file lookups
  if (file) {
    try {
      console.debug('query file %o', file)
      const fileUrl = userPath(file)

      const processedData = await processFile(fileUrl, format, { columns })
      if (processedData) return Response.json(processedData)

      const denoFile = await Deno.open(fileUrl, { read: true })
      return new Response(denoFile.readable)
    } catch (error) {
      return new Response(`query failed: ${error.name} + ${error.message}`)
    }
  }

  // Process multi-file lookups glob-based look ups
  if (glob) {
    console.debug('query glob %o', glob)

    const globUrl = userPath(glob)
    const data = new FormData()
    // TODO: this could use a ReadableStream to make it more efficient

    for await (const match of fs.expandGlob(globUrl)) {
      if (!match.isFile) continue

      const relative = path.relative(repoDir.pathname, match.path)

      const processedData = await processFile(match.path, format, { columns })

      if (processedData) {
        data.set(
          relative,
          new Blob([JSON.stringify(processedData)], {
            type: 'application/json',
          }),
          relative,
        )
      } else {
        data.set(
          relative,
          new Blob([await Deno.readFile(match.path)]),
          relative,
        )
      }
    }
    return new Response(data)
  }
}
