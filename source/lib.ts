import { cyan, gray, green, red, underline } from 'std/fmt/colors.ts'
import { errors } from 'std/http/mod.ts'
import {
  boolean,
  coerce,
  create,
  defaulted,
  object,
  string,
  Struct,
} from 'superstruct'
import { appConfig } from './config.ts'

//
// Re-export std/http errors for quick access in routes
//
export const BadRequest = errors.BadRequest
export const InternalServerError = errors.InternalServerError
export const MethodNotAllowed = errors.MethodNotAllowed
export const NotFound = errors.NotFound
export const Unauthorized = errors.Unauthorized

export const scriptsDir = new URL('../scripts/', import.meta.url)
export const repoDir = new URL('../repo/', import.meta.url)

/** Get a path in the repo, ensuring it is actually in the repo directory */
export function userPath(input: string) {
  const url = new URL(input, repoDir)
  if (!url.pathname.startsWith(repoDir.pathname)) {
    throw new Error(`invalid user path ${input}`)
  }
  return url
}

/** A string of config that either exists, is from an environment variable or has a fallback value */
export function env(key: string, fallback: string) {
  return defaulted(string(), Deno.env.get(key) ?? fallback)
}

/** A boolean of config for whether an environment variable is set, or a fallback value */
export function envBool(key: string, fallback: boolean) {
  return defaulted(
    coerce(boolean(), string(), (v) => Boolean(v)),
    Deno.env.has(key) ?? fallback,
  )
}

// deno-lint-ignore no-explicit-any
export function envObj<T extends Record<string, Struct<any, any>>>(v: T) {
  return defaulted(object(v), {})
}

/** Load a json file, parse it & coerce its contents based on the struct */
export function loadJsonConfig<T>(url: URL, struct: Struct<T>): T {
  let file: string
  try {
    file = Deno.readTextFileSync(url)
  } catch {
    return create({}, struct)
  }
  return create(JSON.parse(file), struct)
}

/** The context for a http route */
export interface Context {
  request: Request
  url: URL
  params: Record<string, string>
}

/** An endpoint on the server */
export interface Endpoint {
  pattern: URLPattern
  fn(ctx: Context): Promise<Response | void> | Response | void
}

/** Execute a binary and get the status code, stdout & stderror */
export async function exec(
  command: URL | string,
  options: Deno.CommandOptions,
) {
  const cmd = new Deno.Command(command, options)
  const result = await cmd.output()
  const decoder = new TextDecoder()
  return {
    ok: result.code === 0,
    code: result.code,
    stdout: decoder.decode(result.stdout),
    stderr: decoder.decode(result.stderr),
  }
}

/** A task that runs over time and complets at some point in the future */
interface AsyncTask<T = unknown> {
  resolve(value: T): void
  reject(error: unknown): void
  fn(): Promise<T>
}

// https://github.com/digitalinteraction/beancounter/blob/master/src/server/library/task-queue.ts
export class Queue {
  current: AsyncTask | null = null
  tasks: AsyncTask[] = []

  get isEmpty(): boolean {
    return this.tasks.length === 0
  }
  add<T>(fn: () => Promise<T>) {
    return new Promise<T>((resolve, reject) => {
      this.tasks.push({ resolve, reject, fn })
      setTimeout(() => this.#execute(), 0)
    })
  }
  async #execute() {
    if (this.current || this.tasks.length === 0) return
    this.current = this.tasks.shift()!
    try {
      this.current.resolve(await this.current.fn())
    } catch (error) {
      this.current.reject(error)
    } finally {
      this.current = null
      setTimeout(() => this.#execute(), 0)
    }
  }
}

/** A shared one-at-a-time queue to run tasks with file IO in a consistent order */
export const ioQueue = new Queue()

/** Based on the http status, pick a colour to log it */
export function pickHttpColor(status: number) {
  if (status >= 500) return (s: string) => red(underline(s))
  if (status >= 400) return red
  if (status >= 300) return cyan
  if (status >= 200) return green
  return red
}

/** Tidy up the deno task for local files */
export function cleanStack(stack: string) {
  const base = 'file://' + Deno.cwd()
  return stack.replaceAll(base, '.')
}

/** Get the value of a http bearer header, if it is set and well-formed */
export function getBearer(headers: Headers) {
  const authz = headers.get('authorization')
  const match = /bearer (.+)/i.exec(authz ?? '')
  return match ? match[1] : undefined
}

/** Format URL search parameters in a pretty way (like httpie) */
export function prettySearch(url: URL) {
  return Array.from(url.searchParams.entries())
    .map(([k, v]) => `${k}==${v}`)
    .join(' ')
}

export function createDebug(namespace: string) {
  return (message: string, ...data: unknown[]) => {
    if (appConfig.env !== 'development') return
    console.debug(`${gray(namespace)} ${message}`, ...data)
  }
}
