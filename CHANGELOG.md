# Changelog

Notable changes to this project are documented here.

## 0.3.6

Fix error when performing requests

## 0.3.5

Add missing `AUTH_KEY` variable to set `auth.key` configuration and add
`init.key` parameter to `RepoApi` client to set the same value client-side.

## 0.3.4

Empty commits no longer fail. If you commit a file and it is the same as the one
already in the repo with commit=true, you get a http 200 with "no-change".

## 0.3.3

Fixed API client part 2

## 0.3.2

Fixed API client

## 0.3.1

Fixed the container build & updated to use Deno `1.42.1`

## 0.3.0

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
  - new configuration `git.commitPrefix` to customise the commit message

## 0.2.1

Tweak `/changed` to show all changes and not remove duplicates

## 0.2.0

Added `/changed` endpoint to inspect when files have changed in git.

## 0.1.0

🎉 This is the first major release, everything is new!
