import * as fs from 'std/fs/mod.ts'
import { appConfig } from './config.ts'
import { createDebug, exec, repoDir, scriptsDir } from './lib.ts'

const debug = createDebug('git')

export interface LogFilesOptions {
  since?: string
  until?: string
  paths?: string[]
}

/** A wrapper around Deno.Command to perform git operations */
export class GitRepo {
  get options() {
    return { cwd: this.dir, signal: this.signal }
  }

  constructor(public dir: string | URL, public signal?: AbortSignal) {}

  async run(namespace: string, args: string[]) {
    debug('%s %o', namespace, args)
    const result = await exec('git', {
      ...this.options,
      args,
    })

    if (!result.ok) {
      console.error('git %o failed', namespace, result.stderr)
      throw new Error(`Failed to ${namespace}, file code=${result.code}`)
    }

    return result
  }

  head() {
    return this.run('head', ['rev-parse', 'HEAD'])
  }
  stage(file: string) {
    return this.run('stage', ['add', file])
  }
  commit(message: string) {
    return this.run('commit', ['commit', '-m', message])
  }
  push() {
    return this.run('push', ['push'])
  }
  // https://stackoverflow.com/questions/4372435
  rollback(sha: string) {
    return this.run('rollback', ['reset', '--hard', sha])
  }
  // https://stackoverflow.com/questions/8200622
  clean() {
    return this.run('clean', ['clean', '--force', '-d'])
  }
  // https://stackoverflow.com/questions/7499938
  logFiles(options: LogFilesOptions = {}) {
    const args: string[] = ['log', '--name-only', `--pretty=format:`]

    if (options.since) args.push(`--since="${options.since}"`)
    if (options.until) args.push(`--until="${options.until}"`)
    if (options.paths) args.push(...options.paths)

    return this.run('log', args)
  }
}

export async function syncRepo(signal?: AbortSignal) {
  if (!appConfig.git.pull) return console.debug('skip pull')
  debug('syncing')

  await fs.ensureDir(new URL('../repo', import.meta.url))

  const result = await exec(new URL('sync_repo.sh', scriptsDir), {
    cwd: repoDir,
    args: [appConfig.git.remote],
    signal,
  })
  if (!result.ok) {
    console.error('Sync failed:', result.stderr)
    throw new Error('Failed to sync repo')
  }

  return result
}
