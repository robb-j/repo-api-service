import * as path from 'std/path/mod.ts'
import * as fs from 'std/fs/mod.ts'
import * as yaml from 'std/yaml/mod.ts'
import * as csv from 'std/csv/mod.ts'
import * as frontMatter from 'std/front_matter/any.ts'
import * as toml from 'std/toml/mod.ts'

import {
  BadRequest,
  Context,
  createDebug,
  MethodNotAllowed,
  repoDir,
  userPath,
} from './lib.ts'

const debug = createDebug('query')

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
    const text = await Deno.readTextFile(fileUrl)
    try {
      return frontMatter.extract(text)
    } catch {
      return { frontMatter: '', body: text, attrs: {} }
    }
  }
  if (format === 'toml') {
    return toml.parse(await Deno.readTextFile(fileUrl))
  }
  if (format !== 'binary') {
    throw new Error(`Unknown type '${format}'`)
  }

  return null
}

function decodeFilter(input: string | null) {
  if (!input) return undefined

  return Object.fromEntries(
    input
      .split(',')
      .filter(Boolean)
      .map((line) => line.split(':')),
  )
}

export async function queryRoute({ request, url }: Context) {
  if (request.method !== 'GET') throw new MethodNotAllowed()

  const format = url.searchParams.get('format') ?? 'binary'
  const file = url.searchParams.get('file')
  const glob = url.searchParams.get('glob')
  const columns = url.searchParams.get('columns')?.split(',')

  // EXPERIMENTAL
  const filter = decodeFilter(url.searchParams.get('filter'))

  // Process single file lookups
  if (file) {
    try {
      const fileUrl = userPath(file)
      debug('file', fileUrl.pathname)

      const processedData = await processFile(fileUrl, format, { columns })
      if (processedData) {
        debug('data %o', processedData)
        return Response.json(processedData)
      }

      debug('raw')
      const denoFile = await Deno.open(fileUrl, { read: true })
      return new Response(denoFile.readable)
    } catch (error) {
      throw new BadRequest(`query failed: ${error.name} + ${error.message}`)
    }
  }

  // Process multi-file lookups glob-based look ups
  if (glob) {
    debug('glob', glob)
    try {
      const globUrl = userPath(glob)
      const data = new FormData()

      // TODO: this could use a ReadableStream to make it more efficient

      for await (const match of fs.expandGlob(globUrl)) {
        if (!match.isFile) continue
        debug('match', match.path)

        const relative = path.relative(repoDir.pathname, match.path)

        const processedData = await processFile(match.path, format, { columns })

        if (processedData) {
          debug('data %o', processedData)
          if (filter && !matchFilter(processedData, filter)) continue

          data.set(
            relative,
            new Blob([JSON.stringify(processedData)], {
              type: 'application/json',
            }),
            relative,
          )
        } else {
          debug('raw')
          data.set(
            relative,
            new Blob([await Deno.readFile(match.path)]),
            relative,
          )
        }
      }
      // TODO: maybe use multipart/related ?
      return new Response(data)
    } catch (error) {
      throw new BadRequest(`query failed: ${error.name} + ${error.message}`)
    }
  }

  throw new BadRequest('Unsupported parameters')
}

// deno-lint-ignore no-explicit-any
function matchFilter(input: any, filter: Record<string, unknown>): boolean {
  for (const [key, value] of Object.entries(filter)) {
    if (dotGet(input, key.split('.')) !== value) return false
  }
  return true
}

// deno-lint-ignore no-explicit-any
function dotGet(input: any, path: string[]): unknown {
  if (input === undefined || input === null) return input
  if (typeof input !== 'object') return undefined

  const [head, ...tail] = path
  if (tail.length === 0) return input[head]
  else return dotGet(input[head], tail)
}
