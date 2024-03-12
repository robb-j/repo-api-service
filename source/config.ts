import 'std/dotenv/load.ts'

import { Configuration, getDenoConfiguration } from 'gruber/configuration.ts'
import { StructError, Structure } from 'gruber/core/structures.js'
import meta from '../app.json' with { type: 'json' }

const config = getDenoConfiguration({})

// A horrid hack of Configuration & Structure to get things working
function boolean(spec: any) {
  if (typeof spec.fallback !== 'boolean') {
    throw new TypeError('spec.fallback must be a boolean')
  }
  const schema = { type: 'boolean', default: spec.fallback }
  const struct = new Structure<boolean>(schema, (input, context) => {
    if (input === undefined) return Boolean(config._getValue(spec))
    if (typeof input !== 'boolean') {
      throw new StructError('Not a boolean', context?.path)
    }
    return input
  })
  Object.assign(struct, {
    [Configuration.spec]: { type: 'boolean', value: spec },
  })
  return struct
}
function number(spec: any) {
  if (typeof spec.fallback !== 'number') {
    throw new TypeError('spec.fallback must be a number')
  }
  const schema = { type: 'number', default: spec.fallback }
  const struct = new Structure<number>(schema, (input, context) => {
    if (input === undefined) return spec.fallback
    if (typeof input !== 'number') {
      throw new StructError('Not a number', context?.path)
    }
    return input
  })
  Object.assign(struct, {
    [Configuration.spec]: { type: 'number', value: spec },
  })
  return struct
}

export const configSpec = config.object({
  env: config.string({ variable: 'DENO_ENV', fallback: 'production' }),
  port: number({ flag: '--port', variable: 'APP_PORT', fallback: 8000 }),
  meta: config.object({
    name: config.string({ variable: 'APP_NAME', fallback: meta.name }),
    version: config.string({ variable: 'APP_VERSION', fallback: meta.version }),
  }),
  git: config.object({
    remote: config.string({
      variable: 'GIT_REMOTE',
      fallback: 'https://github.com/robb-j/r0b-blog.git',
    }),
    commit: boolean({ variable: 'GIT_COMMIT', fallback: false }),
    pull: boolean({ variable: 'GIT_PULL', fallback: false }),
    push: boolean({ variable: 'GIT_PUSH', fallback: false }),
    syncInterval: number({ fallback: 5 * 60 * 1000 }),
  }),

  // TODO: should there be optional values in gruber
  // or should the sensible default be development-friendly
  auth: config.object({
    key: config.string({ fallback: crypto.randomUUID() }),
  }),
})

export function loadConfiguration(url: URL) {
  return config.load(url, configSpec)
}

export const appConfig = await loadConfiguration(
  new URL('../config.json', import.meta.url),
)

if (import.meta.main) {
  try {
    // TODO: this doesn't work
    // console.log(config.getUsage(configSpec))
    // console.log()
    console.log('Current config', JSON.stringify(appConfig, null, 2))
  } catch (error) {
    if (error instanceof StructError) {
      console.error(error.toFriendlyString())
      Deno.exit(1)
    } else {
      throw error
    }
  }
}
