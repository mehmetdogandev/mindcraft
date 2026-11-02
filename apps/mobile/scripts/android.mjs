import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const mobileRoot = path.resolve(__dirname, '..')
const isWin = process.platform === 'win32'
const APP_ID = 'com.aksiyonsoft.mindcraft.v2'
const MAIN_ACTIVITY = `${APP_ID}/.MainActivity`

function resolveAndroidSdkRoot() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    isWin
      ? path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'Android', 'Sdk')
      : process.platform === 'darwin'
        ? path.join(os.homedir(), 'Library', 'Android', 'sdk')
        : path.join(os.homedir(), 'Android', 'Sdk'),
  ].filter(Boolean)

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate
    }
  }
  return candidates[0] || ''
}

const sdkRoot = resolveAndroidSdkRoot()
const exe = isWin ? '.exe' : ''
const adbBin = sdkRoot ? path.join(sdkRoot, 'platform-tools', `adb${exe}`) : `adb${exe}`
const emulatorBin = sdkRoot ? path.join(sdkRoot, 'emulator', `emulator${exe}`) : `emulator${exe}`

function buildEnv() {
  const env = { ...process.env }
  if (sdkRoot) {
    env.ANDROID_HOME = sdkRoot
    env.ANDROID_SDK_ROOT = sdkRoot
    const extraPaths = [
      path.join(sdkRoot, 'platform-tools'),
      path.join(sdkRoot, 'emulator'),
      path.join(sdkRoot, 'cmdline-tools', 'latest', 'bin'),
    ]
    const pathKey = Object.keys(env).find((k) => k.toUpperCase() === 'PATH') || 'PATH'
    env[pathKey] = [...extraPaths, env[pathKey] || ''].join(path.delimiter)
  }
  return env
}

function getRunningEmulators(env) {
  const res = spawnSync(adbBin, ['devices'], { encoding: 'utf8', env })
  if (res.error || res.status !== 0) return []
  return res.stdout
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('emulator-') && /\b(device|offline|bootloader)\b/.test(line))
    .map((line) => {
      const [serial, state] = line.split(/\s+/)
      return { serial, state }
    })
}

function listAvds(env) {
  const res = spawnSync(emulatorBin, ['-list-avds'], { encoding: 'utf8', env })
  if (res.error || res.status !== 0) return []
  return res.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('INFO') && !line.startsWith('WARNING') && !line.startsWith('ERROR'))
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForEmulatorBoot(env, timeoutMs = 120000) {
  const start = Date.now()
  process.stdout.write('[android] Emülatörün açılması bekleniyor')
  while (Date.now() - start < timeoutMs) {
    const running = getRunningEmulators(env).find((d) => d.state === 'device')
    if (running) {
      const boot = spawnSync(adbBin, ['-s', running.serial, 'shell', 'getprop', 'sys.boot_completed'], {
        encoding: 'utf8',
        env,
      })
      if (boot.status === 0 && boot.stdout.trim() === '1') {
        process.stdout.write(' Hazır!\n')
        return running.serial
      }
    }
    process.stdout.write('.')
    await sleep(2000)
  }
  process.stdout.write('\n')
  throw new Error('Emülatör zaman aşımı süresi içinde açılmadı.')
}

function setupAdbReverse(serial, env) {
  const args = serial
    ? ['-s', serial, 'reverse', 'tcp:8081', 'tcp:8081']
    : ['reverse', 'tcp:8081', 'tcp:8081']
  const res = spawnSync(adbBin, args, { encoding: 'utf8', env })
  if (res.status === 0) {
    console.log(`[android] adb reverse tcp:8081 -> tcp:8081 (Metro) bağlandı (${serial || 'default'}).`)
  }
}

function getDataFreeMb(serial, env) {
  const prefix = serial ? ['-s', serial] : []
  const df = spawnSync(adbBin, [...prefix, 'shell', 'df', '-k', '/data'], { encoding: 'utf8', env })
  if (df.status !== 0 || !df.stdout) return null
  const lines = df.stdout.trim().split(/\r?\n/)
  const lastLine = lines[lines.length - 1] || ''
  const parts = lastLine.trim().split(/\s+/)
  // Filesystem 1K-blocks Used Available Use% Mounted on
  if (parts.length >= 4) {
    const availKb = Number.parseInt(parts[3], 10)
    if (!Number.isNaN(availKb)) {
      return Math.round(availKb / 1024)
    }
  }
  return null
}

function prepareEmulatorStorage(serial, env) {
  const prefix = serial ? ['-s', serial] : []
  // Clean up leftover temporary APKs, crash logs, and caches in the emulator
  spawnSync(adbBin, [...prefix, 'shell', 'rm', '-rf', '/data/local/tmp/*'], { encoding: 'utf8', env })
  spawnSync(adbBin, [...prefix, 'logcat', '-c'], { encoding: 'utf8', env })
  spawnSync(adbBin, [...prefix, 'shell', 'pm', 'trim-caches', '999999999999999'], { encoding: 'utf8', env })

  let freeMb = getDataFreeMb(serial, env)
  if (freeMb !== null && freeMb < 500) {
    console.log(`[android] Emülatör boş alanı düşük (${freeMb} MB). Eski kurulumlar ve önbellek temizleniyor...`)
    spawnSync(adbBin, [...prefix, 'uninstall', APP_ID], { encoding: 'utf8', env })
    spawnSync(adbBin, [...prefix, 'uninstall', 'com.mindcraft.v2'], { encoding: 'utf8', env })
    spawnSync(adbBin, [...prefix, 'uninstall', 'host.exp.exponent'], { encoding: 'utf8', env })
    spawnSync(adbBin, [...prefix, 'shell', 'pm', 'trim-caches', '999999999999999'], { encoding: 'utf8', env })
    freeMb = getDataFreeMb(serial, env)
  }

  if (freeMb !== null) {
    console.log(`[android] Emülatör /data kullanılabilir depolama alanı: ${freeMb} MB`)
    if (freeMb < 200) {
      const pkgs = spawnSync(adbBin, [...prefix, 'shell', 'pm', 'list', 'packages', '-3'], { encoding: 'utf8', env })
      const pkgList = (pkgs.stdout || '')
        .split(/\r?\n/)
        .map((l) => l.replace(/^package:/, '').trim())
        .filter(Boolean)
      if (pkgList.length > 0) {
        console.warn(`[android] Uyarı: Emülatör hafızası çok dolu! Yüklü 3. parti paketler: ${pkgList.join(', ')}`)
      }
      console.warn('[android] İpucu: Emülatörü kapatıp "npm run emulator" ile yeniden başlatırsanız 4 GB disk alanı (-partition-size 4096) ile açılır veya Android Studio Device Manager -> Wipe Data yapabilirsiniz.')
    }
  }
}

function launchAppOnEmulator(serial, env) {
  const args = serial
    ? ['-s', serial, 'shell', 'am', 'start', '-n', MAIN_ACTIVITY]
    : ['shell', 'am', 'start', '-n', MAIN_ACTIVITY]
  spawnSync(adbBin, args, { encoding: 'utf8', env })
}

function ensureLocalProperties() {
  const androidDir = path.join(mobileRoot, 'android')
  if (!sdkRoot || !fs.existsSync(androidDir)) return
  const localPropsPath = path.join(androidDir, 'local.properties')
  const escapedSdk = sdkRoot.replace(/\\/g, '\\\\').replace(/:/g, '\\:')
  const content = `sdk.dir=${escapedSdk}\n`
  if (!fs.existsSync(localPropsPath) || fs.readFileSync(localPropsPath, 'utf8') !== content) {
    fs.writeFileSync(localPropsPath, content, 'utf8')
    console.log('[android] android/local.properties güncellendi.')
  }
}

async function ensureEmulatorRunning(env, requestedAvd) {
  const existing = getRunningEmulators(env)
  if (existing.length > 0) {
    console.log(`[android] Çalışan emülatör bulundu: ${existing[0].serial} (${existing[0].state})`)
    const serial = await waitForEmulatorBoot(env)
    setupAdbReverse(serial, env)
    return serial
  }

  if (!fs.existsSync(emulatorBin) && sdkRoot) {
    throw new Error(`Android emulator bulunamadı: ${emulatorBin}. Android Studio SDK Tools içinden Android Emulator bileşenini yükleyin.`)
  }

  const avds = listAvds(env)
  if (avds.length === 0) {
    throw new Error(
      'Hiçbir Android Sanal Cihazı (AVD) bulunamadı. Lütfen Android Studio -> Device Manager üzerinden bir emülatör oluşturun.'
    )
  }

  const targetAvd = requestedAvd || process.env.ANDROID_AVD || avds[0]
  if (!avds.includes(targetAvd)) {
    throw new Error(`"${targetAvd}" adında AVD bulunamadı. Mevcut AVD'ler: ${avds.join(', ')}`)
  }

  console.log(`[android] "${targetAvd}" emülatör penceresi açılıyor...`)
  // Clean stale lock files/directories if no emulator is running
  const avdDir = path.join(os.homedir(), '.android', 'avd', `${targetAvd}.avd`)
  if (fs.existsSync(avdDir)) {
    try {
      for (const entry of fs.readdirSync(avdDir)) {
        if (entry.includes('.lock')) {
          fs.rmSync(path.join(avdDir, entry), { recursive: true, force: true })
        }
      }
    } catch {
      // ignore
    }
  }

  if (isWin) {
    const child = spawn('cmd.exe', ['/c', 'start', '""', emulatorBin, '-avd', targetAvd, '-gpu', 'auto'], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
      env,
    })
    child.unref()
  } else {
    const child = spawn(emulatorBin, ['-avd', targetAvd, '-gpu', 'auto'], {
      detached: true,
      stdio: 'ignore',
      env,
    })
    child.unref()
  }

  const serial = await waitForEmulatorBoot(env)
  setupAdbReverse(serial, env)
  return serial
}

function resolveReactNativeCliBin() {
  const candidates = [
    path.resolve(mobileRoot, 'node_modules', '@react-native-community', 'cli', 'build', 'bin.js'),
    path.resolve(mobileRoot, '..', '..', 'node_modules', '@react-native-community', 'cli', 'build', 'bin.js'),
    path.resolve(mobileRoot, 'node_modules', 'react-native', 'cli.js'),
    path.resolve(mobileRoot, '..', '..', 'node_modules', 'react-native', 'cli.js'),
  ]
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }
  return candidates[1]
}

function runReactNativeCli(args, env) {
  return new Promise((resolve, reject) => {
    const cliBin = resolveReactNativeCliBin()
    const child = spawn(process.execPath, [cliBin, ...args], {
      cwd: mobileRoot,
      stdio: 'inherit',
      env,
    })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`react-native ${args.join(' ')} komutu ${code} koduyla sonlandı.`))
    })
  })
}

async function main() {
  const mode = process.argv[2] || 'start'
  const extraArg = process.argv[3]
  const env = buildEnv()

  if (!sdkRoot || !fs.existsSync(sdkRoot)) {
    console.warn('[android] Uyarı: ANDROID_HOME dizini bulunamadı. Sistem PATH üzerindeki adb/emulator kullanılacak.')
  }

  if (mode === 'emulator') {
    const serial = await ensureEmulatorRunning(env, extraArg)
    prepareEmulatorStorage(serial, env)
    console.log('[android] Emülatör çalışıyor ve geliştirmeye hazır.')
    return
  }

  if (mode === 'build') {
    const serial = await ensureEmulatorRunning(env, extraArg)
    ensureLocalProperties()
    prepareEmulatorStorage(serial, env)
    console.log('[android] Android emülatör buildi alınıyor (react-native run-android --active-arch-only)...')
    await runReactNativeCli(['run-android', '--active-arch-only', '--no-packager'], env)
    return
  }

  if (mode === 'start') {
    let serial = ''
    try {
      serial = await ensureEmulatorRunning(env)
    } catch (err) {
      console.warn(`[android] Emülatör otomatik başlatılamadı (${err instanceof Error ? err.message : err}). Metro yine de başlatılıyor...`)
    }
    ensureLocalProperties()
    if (serial) {
      setTimeout(() => {
        setupAdbReverse(serial, env)
        launchAppOnEmulator(serial, env)
      }, 2500)
    }
    console.log('[android] Metro başlatılıyor ve uygulama emülatörde açılıyor (react-native start)...')
    await runReactNativeCli(['start'], env)
    return
  }

  throw new Error(`Bilinmeyen mod: ${mode}. Kullanım: node scripts/android.mjs <emulator|build|start>`)
}

main().catch((err) => {
  console.error(`[android] Hata: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})
