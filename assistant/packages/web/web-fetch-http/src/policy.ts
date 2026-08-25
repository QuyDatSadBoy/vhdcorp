/**
 * URL validation and content-type classification for the local HTTP(S) fetch
 * provider — the pure, network-free half. The provider's `fetch()` composes
 * these with transport (redirect following, byte caps, decoding).
 *
 * @module @deepseek-ai/dsh-web-fetch-http/policy
 */

import { WebError } from '@deepseek-ai/dsh-web'

/** The body kinds this provider decodes. */
export type FetchableKind = 'html' | 'text'

/**
 * Validate a request URL against the basic transport hygiene the provider
 * enforces before any network access: http(s) only, no embedded credentials,
 * bounded length, and — unless the caller allows them — a target outside this
 * machine and the networks only it can reach (see
 * {@link isPrivateFetchTarget}). Returns the parsed `URL`. Throws
 * {@link WebError} otherwise.
 *
 * @param input - the raw URL string from the fetch request.
 * @param maxUrlLength - inclusive upper bound on `input`'s length.
 * @param allowPrivateTargets - skip the private-target refusal; only a deployment with nothing sensitive on its own networks passes true.
 * @returns the parsed `URL`.
 */
export function validateFetchUrl(input: string, maxUrlLength: number, allowPrivateTargets = false): URL {
  if (input.length > maxUrlLength) {
    throw new WebError(`URL exceeds the maximum length of ${maxUrlLength}`, 'WEB_INVALID_URL')
  }
  let url: URL
  try {
    url = new URL(input)
  } catch (error: unknown) {
    throw new WebError(`invalid URL: ${input}`, 'WEB_INVALID_URL', { cause: error })
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new WebError(`unsupported URL scheme "${url.protocol}" (only http and https are allowed)`, 'WEB_INVALID_URL')
  }
  if (url.username.length > 0 || url.password.length > 0) {
    throw new WebError('credentials in URLs are not allowed', 'WEB_BLOCKED_URL')
  }
  if (!allowPrivateTargets && isPrivateFetchTarget(url.hostname)) {
    throw new WebError(`refusing to fetch a private or local address: ${url.hostname}`, 'WEB_BLOCKED_URL')
  }
  return url
}

/** IPv4 literal as four octets, or undefined when the hostname is not one. */
function ipv4Octets(hostname: string): number[] | undefined {
  const parts = hostname.split('.')
  if (parts.length !== 4) return undefined
  const octets = parts.map(part => (/^\d{1,3}$/.test(part) ? Number(part) : -1))
  return octets.every(octet => octet >= 0 && octet <= 255) ? octets : undefined
}

/**
 * The dotted IPv4 carried by an IPv4-mapped IPv6 address, in either spelling
 * (`::ffff:127.0.0.1` or the hex form `URL` normalizes it to), or undefined
 * when the hostname is not one.
 */
function mappedIpv4(host: string): string | undefined {
  const suffix = /^(?:0*:)*ffff:(.+)$/.exec(host)?.[1]
  if (suffix === undefined) return undefined
  if (ipv4Octets(suffix) !== undefined) return suffix
  const groups = /^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(suffix)
  if (groups === null) return undefined
  const [high, low] = groups.slice(1).map(group => Number.parseInt(group, 16))
  if (high === undefined || low === undefined) return undefined
  return `${high >> 8}.${high & 0xff}.${low >> 8}.${low & 0xff}`
}

/**
 * Whether a request hostname names this machine or a network only reachable
 * from it. A deployment sharing a host with internal services — a database, an
 * admin API, another user's process — otherwise hands the model a probe for all
 * of them, driven by whatever a fetched page says.
 *
 * Judged from the hostname alone: an IP literal in a loopback, private,
 * link-local, carrier-NAT, or unspecified range, an IPv4-mapped IPv6 form of
 * one, or a name reserved for local resolution. A public name whose DNS answer
 * points at a private address still resolves and connects — closing that needs
 * the resolved address, which `fetch` does not expose. Redirects cannot reach a
 * private target regardless: {@link isSameOrigin} already refuses every
 * cross-origin hop.
 *
 * @param hostname - the URL's `hostname` (no port; an IPv6 literal may keep its brackets).
 * @returns true when the target must not be fetched.
 */
export function isPrivateFetchTarget(hostname: string): boolean {
  // `URL.hostname` keeps the brackets around an IPv6 literal.
  const host = hostname.toLowerCase().replace(/^\[(.*)\]$/, '$1')
  if (host === 'localhost' || host.endsWith('.localhost')) return true
  // mDNS and the conventional internal-only suffix: names that resolve only inside.
  if (host.endsWith('.local') || host.endsWith('.internal')) return true
  const octets = ipv4Octets(host)
  if (octets !== undefined) {
    const [a, b] = octets as [number, number, number, number]
    if (a === 127 || a === 10 || a === 0) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 169 && b === 254) return true
    if (a === 100 && b >= 64 && b <= 127) return true
    return false
  }
  if (!host.includes(':')) return false
  if (host === '::1' || host === '::') return true
  // IPv4-mapped IPv6. `URL` normalizes the dotted form to hex groups
  // (`::ffff:127.0.0.1` parses as `::ffff:7f00:1`), so both spellings are
  // decoded back to the four octets the IPv4 ranges above judge.
  const mapped = mappedIpv4(host)
  if (mapped !== undefined) return isPrivateFetchTarget(mapped)
  // Unique-local fc00::/7 and link-local fe80::/10.
  return /^f[cd][0-9a-f]{0,2}:/.test(host) || /^fe[89ab][0-9a-f]?:/.test(host)
}

/**
 * Two URLs are same-origin when scheme, hostname, and port match. A redirect
 * that crosses origins is refused so each new origin requires a fresh tool call
 * (and thus a fresh provider/permission decision).
 *
 * @param a - one of the two URLs to compare.
 * @param b - the other URL to compare.
 * @returns true when `a` and `b` share scheme, hostname, and port.
 */
export function isSameOrigin(a: URL, b: URL): boolean {
  return a.protocol === b.protocol && a.hostname === b.hostname && a.port === b.port
}

/**
 * Classify a response `Content-Type` into a decodable body kind, or `undefined`
 * for an unsupported (e.g. binary) type. `text/html` and `application/xhtml+xml`
 * are `html`; other `text/*` plus a few structured text types are `text`.
 *
 * @param contentType - the raw `Content-Type` header, or `null` when the
 *   response carries none (unsupported).
 * @returns the decodable kind, or `undefined` for an unsupported type.
 */
export function classifyContentType(contentType: string | null): FetchableKind | undefined {
  const mime = (contentType ?? '').replace(/;.*$/s, '').trim().toLowerCase()
  if (mime === 'text/html' || mime === 'application/xhtml+xml') return 'html'
  if (mime.startsWith('text/')) return 'text'
  if (mime === 'application/json' || mime === 'application/xml' || mime.endsWith('+json') || mime.endsWith('+xml')) return 'text'
  return undefined
}

/**
 * Extract the `charset` parameter from a response `Content-Type`, lower-cased,
 * or `undefined` when absent. The provider feeds this label to `TextDecoder`
 * so a non-UTF-8 response is decoded with its declared encoding rather than
 * silently mangled into replacement characters.
 *
 * @param contentType - the raw `Content-Type` header, or `null` when the
 *   response carries none.
 * @returns the lower-cased charset label, or `undefined` when none is declared.
 */
export function parseCharset(contentType: string | null): string | undefined {
  const match = /;\s*charset\s*=\s*"?([^";]+)"?/i.exec(contentType ?? '')
  return match?.[1]?.trim().toLowerCase()
}

/**
 * Build a `TextDecoder` for the declared charset, falling back to UTF-8 when
 * none is declared. Throws {@link WebError} `WEB_UNSUPPORTED_CONTENT_TYPE` when
 * the label is present but not a charset `TextDecoder` recognizes — better to
 * fail loudly than return mojibake.
 *
 * @param charset - the declared charset label (from {@link parseCharset}), or
 *   `undefined` to default to UTF-8.
 * @returns a decoder for the declared (or defaulted) encoding.
 */
export function decoderForCharset(charset: string | undefined): TextDecoder {
  if (charset === undefined) return new TextDecoder('utf-8')
  try {
    return new TextDecoder(charset)
  } catch (error: unknown) {
    throw new WebError(`unsupported charset "${charset}"`, 'WEB_UNSUPPORTED_CONTENT_TYPE', { cause: error })
  }
}
