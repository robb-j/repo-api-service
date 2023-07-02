import 'std/dotenv/load.ts'

import { defaulted, number, optional, string } from 'superstruct'
import { env, envBool, envObj, loadJsonConfig } from './lib.ts'

export const AppConfig = envObj({
  env: env('DENO_ENV', 'production'),
  git: envObj({
    remote: env('GIT_REMOTE', 'https://github.com/robb-j/r0b-blog.git'),
    pull: envBool('GIT_PULL', false),
    push: envBool('GIT_PUSH', false),
    syncInterval: defaulted(
      number(),
      5 * 60 * 1000,
    ),
  }),
  auth: envObj({
    key: optional(string()),
  }),
})

export const appConfig = loadJsonConfig(
  new URL('../config.json', import.meta.url),
  AppConfig,
)

if (import.meta.main) console.log(appConfig)
