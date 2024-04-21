//
// repo-api-client@VERSION
//

/**
 * @typedef RepoQueryOptions
 * @property {'csv' | 'json' | 'toml' | 'yaml' | 'markdown'} [format]
 * @property {string[]} [columns]
 */

/**
 * @typedef LogFilesOptions
 * @property {string[]} [paths]
 * @property {string} [since]
 * @property {string} [until]
 */

export class RepoApi {
  /** @param {string|URL} url */
  constructor(url) {
    this.url = url
  }

  /**
   * @template [T]
   * @param {string} file
   * @param {RepoQueryOptions} options
   * @returns {Promise<T>}
   */
  async queryFile(file, options = {}) {
    const url = new URL('./query', this.url)
    url.searchParams.set('file', file)
    if (options.format) url.searchParams.set('format', options.format)
    if (options.columns) {
      url.searchParams.set('columns', options.columns.join(','))
    }

    const res = await fetch(url)
    if (!res.ok) throw new Error(await res.text())

    return options.format ? res.json() : res.text()
  }

  /**
   * @template {string} [T=string]
   * @param {string} file
   * @param {T[]} columns
   * @returns {Promise<Record<T, string>[]>}
   */
  queryCsvFile(file, columns) {
    return (
      this.queryFile < Record < T,
        string >
          [] >
          (file, {
            format: 'csv',
            columns,
          })
    )
  }

  /**
   * @template [T]
   * @param {string} glob
   * @param {RepoQueryOptions} options
   * @returns {Promise<Map<string, T>>}
   */
  async queryGlob(glob, { format, columns } = {}) {
    const url = new URL('./query', this.url)
    url.searchParams.set('glob', glob)
    if (format) url.searchParams.set('format', format)
    if (columns) url.searchParams.set('columns', columns.join(','))

    const res = await fetch(url)
    if (!res.ok) throw new Error(await res.text())

    const data = await res.formData()
    const output = new Map()

    for (const [key, item] of data) {
      const text = typeof item === 'string' ? item : await item.text()
      output.set(key, format ? JSON.parse(text) : text)
    }

    return output
  }

  /**
   * @template {string} [T=string]
   * @param {string} glob
   * @param {T[]} columns
   * @returns {Promise<Map<string, Record<T, string>[]>>}
   */
  queryCsvGlob(glob, columns) {
    return (
      this.queryGlob < Record < T,
        string >
          [] >
          (glob, {
            format: 'csv',
            columns,
          })
    )
  }

  /**
   * @param {string} file
   * @param {BodyInit} body
   * @param {string} [message]
   */
  async write(file, body, message = undefined) {
    const url = new URL('./file', this.url)
    url.searchParams.set('file', file)
    if (message) url.searchParams.set('message', message)

    const res = await fetch(url, { body, method: 'PUT' })

    if (!res.ok) throw new Error(await res.text())
  }

  /**
   * @param {string} glob
   * @returns {Promise<string[]>}
   */
  async expandGlob(glob) {
    const url = new URL('./expand', this.url)
    url.searchParams.set('glob', glob)

    const res = await fetch(url)
    if (!res.ok) throw new Error(await res.text())

    return res.json()
  }

  /**
   * @param {LogFilesOptions} options
   * @returns {Promise<string[]>}
   */
  async changed(options) {
    const url = new URL('/changed', this.url)
    options.paths?.forEach((path) => url.searchParams.append('paths', path))
    if (options.since) url.searchParams.set('since', options.since)
    if (options.until) url.searchParams.set('until', options.until)

    const res = await fetch(url)
    if (!res.ok) throw new Error(await res.text())

    return res.json()
  }
}
