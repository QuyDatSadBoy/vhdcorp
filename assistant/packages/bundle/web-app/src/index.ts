/**
 * @deepseek-ai/dsh-web-app — the browser-surface bundle's runtime glue plugin
 * plus the bundle patch (`cordis.patch.yml`, declared by the `dsh.bundle.patch`
 * manifest field). The plugin owns the browser-surface glue: it resolves
 * the built frontend dist (workspace knowledge of this bundle, never user
 * config), mounts the `frontend-static` fallback owner over it, registers the
 * harness-source and web-surface prompt sections, the bash-visible web runtime
 * variable, the URL line, and the default-browser handoff. App command-line
 * values arrive through the `webStartup` service expressions in the bundle
 * patch.
 * @module @deepseek-ai/dsh-web-app
 */

import { spawn, type ChildProcess } from 'node:child_process'
import { createRequire } from 'node:module'
import { networkInterfaces } from 'node:os'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { addHarnessSourceSection } from '@deepseek-ai/dsh-app-boot'
import * as FrontendStatic from '@deepseek-ai/dsh-host-frontend-static'
import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment'
import { scrubbedParentEnv } from '@deepseek-ai/dsh-subprocess'
import type {} from '@deepseek-ai/cordis-plugin-loader'
import type {} from '@deepseek-ai/dsh-host-webserver'
import type {} from '@deepseek-ai/dsh-system-prompt'
import type {} from '@deepseek-ai/dsh-shell-env'

/** Stable Cordis plugin name. */
export const name = 'web-app'

/** This dsh installation's root, from either this package's source or built entry. */
const SOURCE_ROOT = fileURLToPath(new URL('../../../..', import.meta.url))

/** Runtime service that releases Web rows after bind-dependent values resolve. */
const WEB_RUNTIME_SERVICE = 'webRuntime'

/** Services required before the web runtime can mount. */
export const inject = ['webServer']

/** Plugin config: composed deployment settings plus per-invocation command-line values. */
export interface Config {
  /** Permit default-browser handoff after the Loader tree settles; an SSH launch suppresses it. */
  openBrowser: boolean
  /** Print the URL line on activation; a non-interactive layer can turn it off. */
  printUrl: boolean
  /**
   * Register the model-visible surface context (the `app:web-surface` prompt
   * section and the `DSH_WEB_URL` bash variable). A one-shot non-interactive
   * layer can turn it off when its user is not in the GUI, so the
   * orientation text would be false.
   */
  surfaceContext: boolean
  /** Explicit `--trusted-host` authorities from this invocation. */
  trustedHosts: string[]
}

export const Config: z<Config> = z.object({
  openBrowser: z.boolean().default(true),
  printUrl: z.boolean().default(true),
  surfaceContext: z.boolean().default(true),
  trustedHosts: z.array(String).default([]),
})

/** Bind-dependent Web values shared by the trust fence and URL display. */
export interface WebRuntimeValues {
  /** LAN IPv4 literals sampled once when the server binds all interfaces. */
  lanAddresses: string[]
  /** LAN literals followed by explicit invocation authorities. */
  trustedHosts: string[]
}

/** Environment variable naming the canonical local URL of this Web GUI. */
const DSH_WEB_URL = 'DSH_WEB_URL' as const

// Display-only mirror of the webserver schema's loopback host: the address the
// local URL always prints. Not a source of truth — the schema is.
const LOOPBACK_HOST = '127.0.0.1'
/** The webserver schema's all-interfaces bind literal. */
const ALL_INTERFACES_HOST = '0.0.0.0'

/** Whether this process was launched through SSH, including a forwarded-port session. */
function launchedThroughSsh(ctx: Context): boolean {
  const environment = launchEnvironmentOf(ctx)
  return ['SSH_CONNECTION', 'SSH_TTY'].some((name) => {
    const value = environment.getFrom(name, ['process'])?.value
    return value !== undefined && value !== ''
  })
}

const BROWSER_OPENER_MODULE = import.meta.resolve('open')

const BROWSER_OPENER_PROGRAM = `
try {
  const { default: open } = await import(${JSON.stringify(BROWSER_OPENER_MODULE)})
  const launcher = await open(process.argv[1])
  if (process.platform === 'win32') {
    // open resolves at PowerShell spawn; keep it referenced until that launcher hands the URL to Windows.
    const code = launcher.exitCode ?? await new Promise((resolve, reject) => {
      function onError(error) {
        launcher.off('close', onClose)
        reject(error)
      }
      function onClose(code) {
        launcher.off('error', onError)
        resolve(code)
      }
      launcher.ref()
      launcher.once('error', onError)
      launcher.once('close', onClose)
    })
    if (code !== 0) throw new Error('browser operating-system launcher exited with code ' + String(code))
  }
  process.exitCode = 0
} catch (error) {
  // The parent turns this exit into the manual-URL warning.
  console.error(error)
  process.exitCode = 1
}
`

/**
 * Resolve one LAN-trust snapshot from the active server bind.
 *
 * Derived entries are port-less IP literals: DNS rebinding needs an
 * attacker-controlled name, while an IP-literal Host is safe on any port and
 * an OS-assigned port is unknowable before bind.
 * @param bindHost - the active webserver bind host.
 * @param extra - explicit `--trusted-host` values, in argument order.
 * @returns the LAN display addresses and invocation-derived fence authorities.
 */
export function resolveLanTrust(bindHost: string, extra: readonly string[]): WebRuntimeValues {
  const lanAddresses = bindHost === ALL_INTERFACES_HOST
    ? Object.values(networkInterfaces()).flat()
      .filter((iface): iface is NonNullable<typeof iface> => iface !== undefined && iface.family === 'IPv4' && !iface.internal)
      .map(iface => iface.address)
    : []
  return { lanAddresses, trustedHosts: [...lanAddresses, ...extra] }
}

/**
 * Phần định hướng mà mô hình nhìn thấy cho phiên chạy qua giao diện web.
 *
 * Bản gốc mô tả đây là "DeepSeek Harness Web GUI" kèm địa chỉ loopback và một
 * loạt hướng dẫn dành cho người ĐANG PHÁT TRIỂN DSH. Với anh em VHD thì phần đó
 * vừa thừa vừa lộ tên sản phẩm nền.
 *
 * Quan trọng hơn: bản gốc mặc định người dùng NGỒI TRÊN CHÍNH MÁY NÀY. Ở đây họ
 * ngồi trình duyệt từ xa và KHÔNG có shell trên máy chủ — đã thấy trợ lý bảo
 * người dùng chạy `cp ... ~/Downloads/` và `scp`, tức là khuyên một việc họ
 * không làm được. Nên phải nói rõ hoàn cảnh và đưa cách giao tệp đúng.
 *
 * @param publicHost - tên miền công khai người dùng truy cập (rỗng nếu chạy nội bộ)
 */
function webSurfacePrompt(publicHost: string): string {
  const base = publicHost === '' ? '' : `https://${publicHost}`
  const cloud = publicHost === ''
    ? ''
    // Đây là TRI THỨC VỀ HOÀN CẢNH, không phải danh sách công cụ: trợ lý cần
    // biết nó chạy ở đâu và người dùng ngồi ở đâu, rồi tự suy ra cách phục vụ.
    // Thiếu phần này, nó tưởng người dùng ngồi trên chính máy nó — đã thấy nó
    // bảo người dùng chạy `cp ... ~/Downloads/` và `scp`, những việc họ không
    // làm được.
    : 'WHERE YOU RUN. You run on a VHD Corp server in the cloud, shared by several '
      + `people at once. The user is somewhere else entirely, in a web browser at ${base}. `
      + 'They cannot see this machine: no shell, no terminal, no file manager, no way to '
      + 'open a path here. Anything you leave only as a filesystem path is invisible to them. '
      + 'Never tell them to run cp, scp, rsync, or to open a local path — they simply cannot. '
      + 'Each person has their own directory here and cannot see anyone else\'s work. '
      + '\n\n'
      + 'HOW TO HAND SOMETHING OVER. Everything you produce reaches the user through the web, '
      + 'so build a URL from the file\'s absolute path, URL-encoded:\n'
      + `- to let them save it: ${base}/vhd-download?path=<absolute-path-url-encoded>\n`
      + `- to let them see it right in the chat: ${base}/vhd-file?path=<absolute-path-url-encoded>\n`
      + 'For an image, embed the second form as markdown so it renders inline '
      + '(![name](url)) and give the first form as a link so they can save it. Both only '
      + 'serve files from that user\'s own directory while they are logged in, so they are '
      + 'safe to paste. Offer the link as soon as you make something worth keeping — do not '
      + 'wait to be asked, and never claim a file cannot be shared. '
      + '\n\n'
      + 'KEEPING THE SERVER HEALTHY. Disk and memory are shared with other people and with '
      + 'the company website. Delete scratch files as soon as you are done with them '
      + '(intermediate downloads, build output, extracted archives, large temporary data), '
      + 'and give genuinely temporary files a .tmp suffix so the nightly cleaner takes them '
      + 'if you forget. Never delete anything the user asked for or might still want — ask '
      + 'first. Check df -h and du -sh . before producing large output. Keep new work inside '
      + 'the current workspace; files elsewhere in your home directory cannot be handed over. '
      + '\n\n'
  return cloud
    + 'You are talking to the user through the VHD Corp internal assistant web interface. '
    + 'When the user says "this page", "this GUI", or "this app" without naming another target, they mean this interface. '
    + 'The browser gives you no implicit DOM, route, or screenshot context — ask the user or use your tools instead of guessing. '
    + 'Do not start a replacement server unless the user asks; if one is genuinely needed, run it as a managed background job and verify its exact URL.'
}

/** Resolve the canonical loopback URL from the active Web server. */
function localWebUrl(ctx: Context): string {
  const port = ctx.get('webServer')?.port
  if (port === undefined) throw new Error('web-app: webServer service missing while resolving Web runtime')
  return `http://${LOOPBACK_HOST}:${String(port)}`
}

/** Dist location is workspace knowledge of this bundle: resolved through the frontend package exports, not configured. */
function resolveDistIndex(): string {
  const require = createRequire(import.meta.url)
  try {
    return require.resolve('@deepseek-ai/dsh-web-frontend/dist/index.html')
  } catch {
    /* v8 ignore next 2 -- reachable only on a checkout without a built dist; the test tree builds it */
    throw new Error('web-app: frontend dist not built; run pnpm run build from the repository root first')
  }
}

/** Start the maintained platform opener without forwarding Harness credentials. */
function spawnBrowserLauncher(url: string): ChildProcess {
  return spawn(process.execPath, [
    '--input-type=module',
    '--eval', BROWSER_OPENER_PROGRAM,
    '--', url,
  ], {
    env: scrubbedParentEnv(),
    stdio: ['ignore', 'inherit', 'pipe'],
  })
}

/** Hand one URL to the operating system's default browser. */
async function openBrowser(url: string): Promise<void> {
  const launcher = spawnBrowserLauncher(url)
  let launcherStderr = ''
  launcher.stderr?.setEncoding('utf8')
  launcher.stderr?.on('data', (chunk: string) => { launcherStderr += chunk })
  await new Promise<void>((resolve, reject) => {
    function onError(error: Error): void {
      launcher.off('close', onClose)
      reject(error)
    }
    function onClose(code: number | null): void {
      launcher.off('error', onError)
      if (code !== 0) {
        const firstLine = launcherStderr.trim().split(/\r?\n/u)[0]
        const reason = firstLine === undefined || firstLine === ''
          ? `browser launcher exited with code ${String(code)}`
          : firstLine.replace(/^(?:[A-Za-z]*Error):\s*/u, '')
        reject(new Error(reason))
        return
      }
      if (launcherStderr !== '') process.stderr.write(launcherStderr)
      resolve()
    }
    launcher.once('error', onError)
    launcher.once('close', onClose)
  })
}

/** Test hooks for the built dist and native browser handoff; production never mutates them. */
export const internals: {
  resolveDistIndex: () => string
  openBrowser: (url: string) => Promise<void>
} = { resolveDistIndex, openBrowser }

/**
 * Mount the Web runtime: dist serving, surface prompt, the bash runtime
 * variable, the URL line, and the default-browser handoff.
 * @param ctx - plugin context carrying the webServer service.
 * @param config - validated {@link Config}.
 */
export function apply(ctx: Context, config: Config): void {
  const runtime = resolveLanTrust(ctx.webServer.host, config.trustedHosts)
  // The loopback URL belongs to this host. Under SSH, the operator reaches it
  // through a local forwarding address that this process cannot derive.
  const handoffBrowser = config.openBrowser && !launchedThroughSsh(ctx)
  // Release dependent rows only after bind-dependent trust has been sampled once.
  ctx.provide(WEB_RUNTIME_SERVICE, runtime)
  ctx.plugin(FrontendStatic, { distIndex: internals.resolveDistIndex() })
  if (config.surfaceContext) {
    ctx.inject(['systemPrompt'], (promptCtx) => {
      addHarnessSourceSection(promptCtx, SOURCE_ROOT)
      promptCtx.systemPrompt.section({
        name: 'app:web-surface',
        order: -98,
        // Tên miền công khai lấy từ --trusted-host (cổng vào truyền vào khi bật)
        text: () => webSurfacePrompt(config.trustedHosts[0] ?? ''),
      })
    })
    ctx.inject(['shellEnv'], (runtimeCtx) => {
      runtimeCtx.shellEnv.register({
        name: 'web-runtime',
        variables: {
          [DSH_WEB_URL]: { description: 'Canonical local URL of the web interface serving this session.' },
        },
        resolve: () => ({ [DSH_WEB_URL]: localWebUrl(runtimeCtx) }),
      })
    })
  }
  if (config.printUrl || handoffBrowser) {
    // The URL line and browser handoff are readiness signals: supervisors RPC
    // as soon as they observe the line, while a browser requests the page as
    // soon as it opens. Neither may run while sibling rows such as the /api
    // route owner are still mounting. Await Loader settlement first; a
    // hand-built tree without a Loader is already the complete tree.
    const announceReady = (): void => {
      const webUrl = localWebUrl(ctx)
      // Reuse the exact LAN snapshot provided to the /api trust fence.
      const lanCandidate = runtime.lanAddresses[0]
      const port = ctx.webServer.port
      if (config.printUrl) {
        console.log(`dsh web: ${webUrl}${lanCandidate === undefined ? '' : ` (LAN: http://${lanCandidate}:${String(port)})`}`)
      }
      if (handoffBrowser) {
        console.log('dsh web: opening the default browser; pass --no-open to disable')
        void internals.openBrowser(webUrl).catch((error: unknown) => {
          const reason = error instanceof Error ? error.message : String(error)
          console.error(`web-app: could not open the default browser because ${reason}; visit ${webUrl} manually`)
        })
      }
    }
    // This row's own activation can precede a sibling failure. The app owns
    // readiness by waiting for its Loader tree, or announces at once in a
    // hand-built context without Loader.
    const settled = ctx.get('loader')?.await()
    if (settled === undefined) announceReady()
    else {
      void settled.then(() => {
        // The tree can be disposed while the boot was in flight (early
        // SIGTERM); a URL line or browser tab for a dead server would only
        // mislead, and reading the torn-down port would turn a clean shutdown
        // into a crash.
        if (ctx.get('webServer') !== undefined) announceReady()
      // Loader reports a failed boot; this row only stays quiet.
      }, () => {})
    }
  }
}
