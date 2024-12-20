# repo-api-service

Ever wanted an HTTP API to query what's in a git repo and retrive files? And
maybe even write back to the repo and commit changes upstream? Repo Api Service
does that. It is a service that checks out a git repo and keeps it up to date.
There is then an API to get and query files in the repository and another
endpoint to write changes to the repo and commit and push them upstream.

This is designed to be run as a single container bound to a single git
repository. So to support multiple repositories you run multiple containers with
different configurations.

## Endpoints

> Examples are written with [httpie](https://httpie.io/) with
> [robb-j/r0b-blog](https://github.com/robb-j/r0b-blog) as the repository being
> queried.

### `GET /`

Check the app is online and find out the app version.

### `GET /healthz`

Ensure the app is healthy, useful for
[Kubernetes checks](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/).

### `GET /query`

Search and retrieve files from the git repository. You can either get a specific
file or get multiple files using a
[glob pattern](https://en.wikipedia.org/wiki/Glob_(programming)).

**get a specific file**

Use the `file` search parameter to get a specific file and it will response will
be the body of the request.

```sh
http $URL/query file==content/index.md
```

<details>
<summary>Response</summary>

```http
HTTP/1.1 200 OK
date: Sun, 02 Jul 2023 12:52:25 GMT
transfer-encoding: chunked
vary: Accept-Encoding

---
title: r0b's random ramblings
layout: home
---

# r0b's random ramblings

This is a place for me to jot down thing's I've experimented with
and document them for my future self ... or other people too I guess.
```

</details>

**query with a glob**

Use the `glob` parameter to retrieve multiple files and it will return them as a
`multipart/form-data` response where each entry is an item in the form data
where the name is the path of the matched file and the body is the contents of
the file.

```sh
http $URL/query "glob==content/post/*.md"
```

<details>
<summary>Response</summary>

```http
HTTP/1.1 200 OK
content-type: multipart/form-data; boundary=----3515918059508545431921584621
date: Sun, 02 Jul 2023 12:56:27 GMT
transfer-encoding: chunked
vary: Accept-Encoding

------3515918059508545431921584621
Content-Disposition: form-data; name="content/post/bundle-javascript-with-eleventy-and-esbuild.md"; filename="content/post/bundle-javascript-with-eleventy-and-esbuild.md"
Content-Type: application/octet-stream

---
title: Bundle JavaScript with Eleventy and esbuild
date: 2021-06-27
draft: false
summary: >
  How to add JavaScript and bundle it together for an Eleventy project plus integration with the development server for automatic reloading.
---

[Static site generators are great...](https://blog.r0b.io/post/compile-sass-with-eleventy/)
as I have previously mentioned,
here is how to bundle JavaScript into your Eleventy site too.
------3515918059508545431921584621
...
```

</details>

**parsing data**

You can tell the service to parse the file contents for you for both `file` and
`glob` queries by using the `format` parameter. These formats are supported:
`json`, `yaml`,`csv`,`markdown`,`toml`, `ini` and `binary`. If not specified it
defaults to `binary`.

```sh
http $URL/query file==content/index.md format==markdown
```

<details>
<summary>Response</summary>

```http
HTTP/1.1 200 OK
content-encoding: gzip
content-length: 207
content-type: application/json
date: Sun, 02 Jul 2023 12:57:58 GMT
vary: Accept-Encoding

{
    "attrs": {
        "layout": "home",
        "title": "r0b's random ramblings"
    },
    "body": "# r0b's random ramblings\n\nThis is a place for me to jot down thing's I've experimented with\nand document them for my future self ... or other people too I guess.\n",
    "frontMatter": "title: r0b's random ramblings\nlayout: home"
}
```

</details>

**CSV columns**

When getting CSV files you can also specify `columns` to convert CSV records
into objects rather than just arrays in the JSON.

```sh
http $URL/query file==some.csv format==csv columns==date,title,age
```

<details>
<summary>Response</summary>

```http
HTTP/1.1 200 OK
content-encoding: gzip
content-length: 207
content-type: application/json
date: Sun, 02 Jul 2023 12:57:58 GMT
vary: Accept-Encoding

[
  {"date": "2023-06-01", "title": "Something", "age": 42},
  {"date": "2023-06-01", "title": "Something", "age": 42},
  {"date": "2023-06-01", "title": "Something", "age": 42}
]
```

</details>

### `PUT /file`

Use the file endpoint to write a file to repository, commit it to git and push
the change upstream. It will write the file in the request body at the location
specified by the `file` parameter.

Use the `message` parameter to set the commit message, this will be prefixed
with `repo-api-service` and defaults to `repo-api-service: automated commit` if
not set.

```sh
cat page.md | http put $URL/file file==page.md message=="Update page"
```

It will return a http/200 if everything went ok. If it failed, it will rollback
the git back to the state to before the file was written.

### `GET /expand`

If you want to see whats in a repository without retrieving the whole files, you
can ask the API to expand a glob for you.

```sh
http $URL/expand "glob==content/post/*.md"
```

<details>
<summary>Response</summary>

```http
HTTP/1.1 200 OK
content-encoding: gzip
content-length: 587
content-type: application/json
date: Sun, 02 Jul 2023 13:06:06 GMT
vary: Accept-Encoding

[
    "content/post/automating-developer-operations-for-nodejs.md",
    "content/post/bundle-javascript-with-eleventy-and-esbuild.md",
    "content/post/compile-sass-with-eleventy.md",
    "content/post/connecting-an-rpi-to-802.1x.md",
    "content/post/creating-a-nova-extension-with-typescript.md",
    "content/post/creating-custom-javascript-errors.md",
    "content/post/creating-drag-interactions-with-set-pointer-capture-in-java-script.md",
    "content/post/deploying-esp32-with-spiffs-using-github-actions.md",
    "content/post/embed-jsdoc-comments-in-an-eleventy-website-with-ts-morph.md",
    "content/post/esm-nodejs-typescript-with-subpath-exports.md",
    "content/post/getting-started-with-kube-prometheus-stack.md",
    "content/post/host-an-ics-calendar-feed-with-eleventy.md",
    "content/post/minimal-rpi-kiosk.md",
    "content/post/my-first-generator-function.md",
    "content/post/quick-concise-array-to-map-conversion-in-javascript.md",
    "content/post/regrets-of-a-research-software-engineers-tech-stacks.md",
    "content/post/running-node-js-as-a-systemd-service.md",
    "content/post/spoofing-an-rpi-mac-address.md",
    "content/post/tales-from-the-bashrc-bashrc.md",
    "content/post/tales-from-the-bashrc-d1.md",
    "content/post/tales-from-the-bashrc-npr.md",
    "content/post/trying-to-make-a-vanilla-web-app.md",
    "content/post/useful-rpi-wifi-commands.md",
    "content/post/using-jsx-without-react.md",
    "content/post/using-urlpattern-to-add-edit-on-github-support-to-my-blog.md",
    "content/post/yoath-released.md"
]
```

</details>

### `GET /changed`

> new in **0.2.0**

Find out which files changed at certain times and/or at certain paths or globs.

```sh
http :9000/changed since=="10 days ago" paths=="content/post/*"
```

There are these URL search parameters available, you can specify any combination
or none of them:

- `since` — specify the lower bound of the date range, only showing files that
  were changed after this date
- `until` — specify the higher bound of the date range, to only show files
  changed before this date
- `paths` — narrow down the paths you wish to search within. This can be set
  multiple times to look at different files or use multiple glob patterns. The
  request will fail if a path is specified that doesn't exist in the repository.

> Git dates — You can see the accepted formats from
> [this git commit](https://github.com/git/git/commit/34dc6e73b01011fcbe0f314d47fd6120382ae145)

<details>
<summary>Response</summary>

```http
HTTP/1.1 200 OK
content-encoding: gzip
content-length: 136
content-type: application/json
date: Wed, 02 Aug 2023 13:49:09 GMT
vary: Accept-Encoding

[
    "content/post/useful-rpi-wifi-commands.md",
    "content/post/host-an-ics-calendar-feed-with-eleventy.md",
    "content/post/host-a-ics-calendar-feed-with-eleventy.md",
    "content/post/embed-jsdoc-comments-in-an-eleventy-website-with-ts-morph.md"
]
```

</details>

## Configuration

The service can be configured by a configuration file, CLI arguments or
environment variables.

To see how to configure the app, run `deno run -A source/config.ts` which shows
the default configuration, how it is configured and the table below. The JSON
configuration file should be placed at the root of the project as `config.json`.

| name             | type    | flag   | variable    | fallback                               |
| ---------------- | ------- | ------ | ----------- | -------------------------------------- |
| auth.key         | string  | ~      | AUTH_KEY    |                                        |
| env              | string  | ~      | DENO_ENV    | development                            |
| git.commit       | boolean | ~      | GIT_COMMIT  | false                                  |
| git.commitPrefix | string  | ~      | ~           | repo-api-service                       |
| git.pull         | boolean | ~      | GIT_PULL    | false                                  |
| git.push         | boolean | ~      | GIT_PUSH    | false                                  |
| git.remote       | string  | ~      | GIT_REMOTE  | https://github.com/robb-j/r0b-blog.git |
| git.syncInterval | number  | ~      | ~           | 300000                                 |
| meta.name        | string  | ~      | APP_NAME    | robb-j/repo-api-service                |
| meta.version     | string  | ~      | APP_VERSION | 1.2.3                                  |
| port             | number  | --port | APP_PORT    | 8000                                   |

- `env` — Set the "mode" of the service, set to `development` to enable debug
  logging.
- `git.remote` — The remote of the git repository for the service.
- `git.pull` — Whether to pull the git repository while synchronising.
- `git.push` — Whether to push back to the git remote.
- `git.syncInterval` — How often to synchronise the git repository, in
  milliseconds.
- `auth.key` — Turn on authentication, if set all requests will need to have a
  `Authorization: Bearer $KEY` header with the same value for them to be
  accepted. Setting to empty string `""` disables this

### Git permissions

The user that runs the repo-api-service needs to the correct permissions to
pull/push from the the repository in question. This can be an ssh key for
example. If using the container, this is the `deno` user and the credentials
should be put into `/home/deno/.ssh` and you need to make sure they have the
correct file permissions and ownership.

## Deplopment

Each version is released as a container on `ghcr.io`, built automatically with
GitHub Actions. These images are currently build to `amd64` and `arm64`
architectures. You could use a **docker-compose.yml** file like this to run the
container:

```yml
version: '2.4'

services:
  repo-api:
    image: ghcr.io/robb-j/repo-api-service:0.1.0
    environment:
      NO_PUSH: 'true'
      NO_PULL: 'true'
      REMOTE_URL: git@github.com:robb-j/r0b-blog.git
    volumes:
      - ./repos/blog:/app/repo
      - ~/.ssh:/home/deno/.ssh
    ports:
      - 8000:8000
```

The container runs on port `8000` by default and the repository goes into
`/app/repo`. You can configure git access to the `deno` user by mounting
credentials into `/home/deno/.ssh`.

Make sure any SSH credentials or files in the `.ssh` folder have the correct
file permissions and ownership otherwise they will be ignored. It is also useful
to add in `.ssh/known_hosts` so that the container doesn't need to confirm the
hosts.

If you want to use a config file, mount that at `/app/config.json` in the
container.

## API Client

There is an API client at `https://esm.r0b.io/repo-api-client@0.3.0/mod.js`, you
can see the source code at
[client/repo-api-client.js](./client/repo-api-client.js).

```js
import { RepoApi } from 'https://esm.r0b.io/repo-api-client@0.3.0/mod.js'

const api = new RepoApi('https://example.com')

const indexFile = await api.queryFile('content/index.md', {
  format: 'markdown',
})

const csv = await api.queryCsvFile('products.csv', ['id', 'date', 'name'])

const pages = await api.queryGlob('**/*.md', { format: 'markdown' })

const usage = await api.queryCsvGlob('**/usage.csv', ['id', 'date', 'amount'])

const contents = 'hello there'
await api.write('hello.txt', contents, 'add hello.txt file')

const fileNames = await api.expandGlob('**/*.md')
```

## Development

There are deno tasks for local development and they are configured to run the
app on port `9000` and have the repository in `repo`. Git pull & push are
disabled by default so can manually check out the repository in question or just
work with static files. You can set environment variables by creating a `.env`
file at the root of the project.

```sh
deno task dev
```

**release process**

1. Make sure the `CHANGELOG.md` and [Configuration](#configuration) is up to
   date
2. Bump the version in `app.json` and `client/mod.js`
3. Commit the change as `vX.Y.Z`
4. Tag the commit as `vX.Y.Z`
5. Push the commit & tag and it'll build the container.
6. Publish the latest version of the client JavaScript by uploading to the S3
   bucket with public-read and the current version in the comment.
