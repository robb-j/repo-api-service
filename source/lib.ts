import {
  boolean,
  coerce,
  create,
  defaulted,
  object,
  string,
  Struct,
} from 'superstruct'

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

export function env(key: string, fallback: string) {
  return defaulted(string(), Deno.env.get(key) ?? fallback)
}

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

export function loadJsonConfig<T>(url: URL, struct: Struct<T>): T {
  let file: string
  try {
    file = Deno.readTextFileSync(url)
  } catch {
    return create({}, struct)
  }
  return create(JSON.parse(file), struct)
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
