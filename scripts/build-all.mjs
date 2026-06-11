import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const baseDist = join(root, 'dist', '_base')
const outputRoot = join(root, 'dist')

const ITERATIONS = [
  { name: '10clk', mode: '10clk' },
  { name: '60sec', mode: '60sec' },
  { name: 'full', mode: 'full' },
]

const NETWORKS = [
  { name: 'Applovin', tag: 'al', injection: 'mraid', zip: false, runtime: 'applovin' },
  { name: 'Google', tag: 'gg', injection: 'google', zip: true, runtime: 'google' },
  { name: 'Ironsource', tag: 'is', injection: 'mraid', zip: false, runtime: 'ironsource' },
  { name: 'Mintegral', tag: 'mtg', injection: 'mintegral', zip: true, runtime: 'mintegral' },
  { name: 'Facebook', tag: 'fb', injection: 'blank', zip: false, runtime: 'meta' },
  { name: 'Unity', tag: 'un', injection: 'mraid', zip: false, runtime: 'unityads' },
  { name: 'Vungle', tag: 'vu', injection: 'vungle', zip: true, runtime: 'vungle' },
  { name: 'Moloco', tag: 'mo', injection: 'blank', zip: false, runtime: 'moloco' },
]

const INJECTIONS = {
  blank: '',
  mraid: '<script src="mraid.js"></script>',
  google: '<script type="text/javascript" src="https://tpc.googlesyndication.com/pagead/gadgets/html5/api/exitapi.js"></script>',
  mintegral: '',
  vungle: '<script>window.__VUNGLE__=true;</script>',
}

function getFilenameBase(iteration) {
  return `sb_mip_game5_stickerbookpuzzle_01_real_na_noseason_en_${iteration.name}_na`
}

function runBuild(iteration) {
  rmSync(baseDist, { recursive: true, force: true })
  execFileSync(process.execPath, [
    join(root, 'node_modules', 'vite', 'bin', 'vite.js'),
    'build',
    '--outDir',
    'dist/_base',
    '--emptyOutDir',
  ], {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      PLAYABLE_ITERATION: iteration.mode,
    },
  })
}

function stripUnsupportedAttrs(html) {
  return html
    .replace(/\s+type="module"/g, '')
    .replace(/\s+crossorigin(?:="[^"]*")?/g, '')
}

function injectForNetwork(html, network) {
  let output = stripUnsupportedAttrs(html)
  const injection = [
    `<script>window.__AD_NETWORK__=${JSON.stringify(network.runtime)};</script>`,
    INJECTIONS[network.injection] || '',
  ].filter(Boolean).join('\n    ')

  if (network.tag === 'mtg') {
    output = output.replace('<body>', '<body onload="gameReady()">')
  }

  if (network.tag === 'un') {
    output = output.replaceAll('window.top', 'window.self')
  }

  if (injection) {
    output = output.replace('<head>', `<head>\n    ${injection}`)
  }

  return `<!-- ad-network: ${network.name} | ${network.tag} -->\n${output}`
}

function makeCrcTable() {
  const table = []
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
}

const crcTable = makeCrcTable()

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function dosTimeDate(date = new Date()) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)
  const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
  return { time, date: dosDate }
}

function writeUint32(buffer, value, offset) {
  buffer.writeUInt32LE(value >>> 0, offset)
}

function createSingleFileZip(entryName, content) {
  const name = Buffer.from(entryName)
  const data = Buffer.from(content)
  const crc = crc32(data)
  const stamp = dosTimeDate()

  const local = Buffer.alloc(30 + name.length)
  writeUint32(local, 0x04034b50, 0)
  local.writeUInt16LE(20, 4)
  local.writeUInt16LE(0, 6)
  local.writeUInt16LE(0, 8)
  local.writeUInt16LE(stamp.time, 10)
  local.writeUInt16LE(stamp.date, 12)
  writeUint32(local, crc, 14)
  writeUint32(local, data.length, 18)
  writeUint32(local, data.length, 22)
  local.writeUInt16LE(name.length, 26)
  local.writeUInt16LE(0, 28)
  name.copy(local, 30)

  const central = Buffer.alloc(46 + name.length)
  writeUint32(central, 0x02014b50, 0)
  central.writeUInt16LE(20, 4)
  central.writeUInt16LE(20, 6)
  central.writeUInt16LE(0, 8)
  central.writeUInt16LE(0, 10)
  central.writeUInt16LE(stamp.time, 12)
  central.writeUInt16LE(stamp.date, 14)
  writeUint32(central, crc, 16)
  writeUint32(central, data.length, 20)
  writeUint32(central, data.length, 24)
  central.writeUInt16LE(name.length, 28)
  central.writeUInt16LE(0, 30)
  central.writeUInt16LE(0, 32)
  central.writeUInt16LE(0, 34)
  central.writeUInt16LE(0, 36)
  writeUint32(central, 0, 38)
  writeUint32(central, 0, 42)
  name.copy(central, 46)

  const end = Buffer.alloc(22)
  writeUint32(end, 0x06054b50, 0)
  end.writeUInt16LE(0, 4)
  end.writeUInt16LE(0, 6)
  end.writeUInt16LE(1, 8)
  end.writeUInt16LE(1, 10)
  writeUint32(end, central.length, 12)
  writeUint32(end, local.length + data.length, 16)
  end.writeUInt16LE(0, 20)

  return Buffer.concat([local, data, central, end])
}

rmSync(outputRoot, { recursive: true, force: true })

for (const iteration of ITERATIONS) {
  runBuild(iteration)

  const baseHtml = readFileSync(join(baseDist, 'index.html'), 'utf8')
  const filenameBase = getFilenameBase(iteration)

  for (const network of NETWORKS) {
    const html = injectForNetwork(baseHtml, network)
    const networkDir = join(outputRoot, iteration.name, network.name)
    mkdirSync(networkDir, { recursive: true })
    const htmlName = `${filenameBase}_${network.tag}.html`
    const htmlPath = join(networkDir, htmlName)

    if (network.zip) {
      writeFileSync(join(networkDir, `${filenameBase}_${network.tag}.zip`), createSingleFileZip('index.html', html))
    } else {
      writeFileSync(htmlPath, html)
    }
  }
}
