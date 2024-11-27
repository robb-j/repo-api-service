import 'std/dotenv/load.ts'

import { getDenoConfiguration, StructError } from 'gruber/mod.ts'
import meta from '../app.json' with { type: 'json' }

const config = getDenoConfiguration({})

export const configSpec = config.object({
  env: config.string({ variable: 'DENO_ENV', fallback: 'development' }),
  port: config.number({ flag: '--port', variable: 'APP_PORT', fallback: 8000 }),
  meta: config.object({
    name: config.string({ variable: 'APP_NAME', fallback: meta.name }),
    version: config.string({ variable: 'APP_VERSION', fallback: meta.version }),
  }),
  git: config.object({
    remote: config.string({
      variable: 'GIT_REMOTE',
      fallback: 'https://github.com/robb-j/r0b-blog.git',
    }),
    commit: config.boolean({ variable: 'GIT_COMMIT', fallback: false }),
    commitPrefix: config.string({ fallback: 'repo-api-service' }),
    pull: config.boolean({ variable: 'GIT_PULL', fallback: false }),
    push: config.boolean({ variable: 'GIT_PUSH', fallback: false }),
    syncInterval: config.number({ fallback: 5 * 60 * 1000 }),
  }),
  auth: config.object({
    key: config.string({ variable: 'AUTH_KEY', fallback: '' }),
  }),
})

export async function loadConfiguration(url: URL) {
  const appConfig = await config.load(url, configSpec)

  // Don't allow the app to run in production without a secret
  if (appConfig.env === 'production' && appConfig.auth.key === '') {
    throw new Error('auth.key not set while in production mode')
  }

  return appConfig
}

export const appConfig = await loadConfiguration(
  new URL('../config.json', import.meta.url),
)

if (import.meta.main) {
  try {
    console.log(config.getUsage(configSpec))
    console.log()
    console.log('Current:\n', JSON.stringify(appConfig, null, 2))
  } catch (error) {
    if (error instanceof StructError) {
      console.error(error.toFriendlyString())
      Deno.exit(1)
    } else {
      throw error
    }
  }
}
