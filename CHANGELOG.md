# Changelog

Notable changes to this project are documented here.

## next

Internally refactored code to use [gruber](https://github.com/robb-j/gruber).
This project was part of the inspiration for gruber so it's fitting to be
migrated to it, it mostly involved removing code too! 🎉

- **breaking** — by default the server won't commit changes, set `GIT_COMMIT=1`
  or the `git.commit` configuration to `true`.
- added support for `.ini` file parsing
- configure the port to run on with the `--port` flag or `APP_PORT` variable
- override the result of `GET /` by setting `APP_NAME`, `APP_VERSION` or
  `app.name` and `app.version` via configuration.
- See the current configuration and print usage by running the config.ts script
  ~ `deno run -A source/config.ts`

## 0.2.1

Tweak `/changed` to show all changes and not remove duplicates

## 0.2.0

Added `/changed` endpoint to inspect when files have changed in git.

## 0.1.0

🎉 This is the first major release, everything is new!
