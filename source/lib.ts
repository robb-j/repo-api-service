import { HTTPError } from 'gruber/mod.ts'
import { cyan, gray, green, red, underline } from 'std/fmt/colors.ts'
import { appConfig } from './config.ts'

// TODO: these should be in appConfig
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
  debug = createDebug('queue')

  get isEmpty(): boolean {
    return this.tasks.length === 0
  }
  add<T>(fn: () => Promise<T>) {
    this.debug('add', fn)
    return new Promise<T>((resolve, reject) => {
      this.tasks.push({ resolve, reject, fn })
      setTimeout(() => this.#execute(), 0)
    })
  }
  async #execute() {
    this.debug(
      'execute current=%o tasks=%o',
      Boolean(this.current),
      this.tasks.length,
    )
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

export function assertAuth(request: Request) {
  if (appConfig.auth.key === '') return
  const header = getBearer(request.headers)
  if (header !== appConfig.auth.key) throw HTTPError.unauthorized()
}
