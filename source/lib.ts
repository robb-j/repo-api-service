import * as fs from 'std/fs/mod.ts'

export const scriptsDir = new URL('../scripts/', import.meta.url)
export const repoDir = new URL('../repo/', import.meta.url)

export const REMOTE_URL = env('REMOTE_URL')
export const NO_PUSH = Deno.env.has('NO_PUSH')
export const NO_PULL = Deno.env.has('NO_PULL')
export const SYNC_INTERVAL = 5 * 60 * 1000

/** Get a path in the repo, ensuring it is actually in the repo directory */
export function userPath(input: string) {
  const url = new URL(input, repoDir)
  if (!url.pathname.startsWith(repoDir.pathname)) {
    throw new Error(`invalid user path ${input}`)
  }
  return url
}

/** Grab a strongly typed environment variable or throw an Error */
export function env(key: string) {
  const value = Deno.env.get(key)
  if (!value) throw new Error(`${key} not set`)
  return value
}

export interface Context {
  request: Request
  url: URL
  params: Record<string, string>
}
export interface Endpoint {
  pattern: URLPattern
  fn(ctx: Context): Promise<Response | void> | Response | void
}

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

export async function syncRepo(signal?: AbortSignal) {
  if (NO_PULL) return console.log('skip pull (NO_PULL=1)')

  await fs.ensureDir(new URL('../repo', import.meta.url))

  const result = await exec(
    new URL('sync_repo.sh', scriptsDir),
    { cwd: repoDir, args: [REMOTE_URL], signal },
  )
  if (!result.ok) {
    console.error('Sync failed:', result.stderr)
    throw new Error('Failed to sync repo')
  }
  return result
}

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

export const ioQueue = new Queue()
