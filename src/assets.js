import bgmSrc from './assets/Audio/BGM.mp3'
import correctSrc from './assets/Audio/Correct Answer.mp3'
import wrongSrc from './assets/Audio/Wrong Answer.mp3'
import finishedSrc from './assets/Audio/Finished.mp3'

const spriteModules = import.meta.glob('./assets/Sprites/**/*.{png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
})

function assetByPath(pathWithoutExtension) {
  return Object.entries(spriteModules).find(([path]) => (
    path.endsWith(`${pathWithoutExtension}.png`) || path.endsWith(`${pathWithoutExtension}.webp`)
  ))?.[1]
}

function assetByStickerId(folder, id) {
  const prefix = `/sticker_${id}_`
  return Object.entries(spriteModules).find(([path]) => (
    path.includes(`/Sprites/${folder}/`) && path.includes(prefix)
  ))?.[1]
}

function numberedAssetById(id) {
  return assetByPath(`/Numbered/${id}`)
}

export const SPRITES = {
  bgWhite: assetByPath('/Background/Bg-colored-white-extended_1'),
  bgColor: assetByPath('/Background/Bg-colored-extended_1'),
  tray: assetByPath('/blue-cointainer'),
  hand: assetByPath('/hand-icon'),
  burst: assetByPath('/Star Burst'),
  logo: assetByPath('/End Card/logo'),
  cta: assetByPath('/End Card/ctaButton'),
}

export const AUDIO = {
  bgm: bgmSrc,
  correct: correctSrc,
  wrong: wrongSrc,
  finished: finishedSrc,
}

export const COLORED = {}
export const DRAGGABLE = {}
export const NUMBERED = {}

for (let id = 1; id <= 50; id += 1) {
  COLORED[id] = assetByStickerId('Colored', id)
  DRAGGABLE[id] = assetByStickerId('Draggable', id)
  NUMBERED[id] = numberedAssetById(id)
}

Object.entries(SPRITES).forEach(([key, value]) => {
  if (!value) throw new Error(`Missing sprite asset: ${key}`)
})

for (let id = 1; id <= 50; id += 1) {
  if (!COLORED[id] || !DRAGGABLE[id] || !NUMBERED[id]) {
    throw new Error(`Missing sticker asset for id ${id}`)
  }
}
