import 'std/dotenv/load.ts'

import { coerce, defaulted, number, optional, string } from 'superstruct'
import { envBool, env, envObj, loadJsonConfig } from './lib.ts'

export const AppConfig = envObj({
  git: envObj({
    remote: env('GIT_REMOTE', 'https://github.com/robb-j/r0b-blog.git'),
    pull: envBool('GIT_PULL', false),
    push: envBool('GIT_PULL', false),
    syncInterval: defaulted(
      coerce(number(), string(), (v) => parseInt(v)),
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
