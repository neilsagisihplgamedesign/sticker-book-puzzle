import Phaser from 'phaser'
import './styles.css'
import { COLORED, SPRITES } from './assets.js'
import {
  GAME_BOTTOM_BACKGROUND_CSS,
  HEIGHT,
  SKIP_TO_ENDCARD,
  STICKERS,
  TRAY_TOP_Y,
  WIDTH,
  getStickerLayout,
} from './constants.js'
import { StickerBookScene } from './game.js'
import {
  bindLifecycle,
  installLifecycleStubs,
  mraidReady,
  notifyEndcardShown,
  notifyGameReady,
  notifyGameEnd,
  notifyGameStart,
  triggerCTA,
} from './networks.js'
import { PreloaderScene } from './preloader.js'

const VIEWPORT_OVERSCAN_X = 2

function waitForDomReady() {
  if (document.readyState !== 'loading') return Promise.resolve()
  return new Promise((resolve) => {
    document.addEventListener('DOMContentLoaded', resolve, { once: true })
  })
}

function layoutCanvas(game) {
  const resize = () => {
    const viewWidth = Math.max(window.visualViewport?.width || window.innerWidth, 1)
    const viewHeight = Math.max(window.visualViewport?.height || window.innerHeight, 1)
    const scale = Math.min(viewWidth / WIDTH, viewHeight / HEIGHT)
    const canvasWidth = Math.ceil(WIDTH * scale) + VIEWPORT_OVERSCAN_X
    const canvasHeight = Math.ceil(HEIGHT * scale)
    const canvasLeft = Math.floor((viewWidth - canvasWidth) / 2)
    const canvasTop = Math.floor((viewHeight - canvasHeight) / 2)
    const app = document.getElementById('app')

    app?.style.setProperty('--game-tray-top-y', `${canvasTop + TRAY_TOP_Y * scale}px`)
    app?.style.setProperty('--game-bottom-bg', GAME_BOTTOM_BACKGROUND_CSS)

    const canvas = game.canvas
    if (canvas) {
      canvas.style.width = `${canvasWidth}px`
      canvas.style.height = `${canvasHeight}px`
      canvas.style.marginLeft = `${canvasLeft}px`
      canvas.style.marginTop = `${canvasTop}px`
    }
  }

  window.addEventListener('resize', resize)
  window.addEventListener('orientationchange', resize)
  window.visualViewport?.addEventListener('resize', resize)
  game.events.once('destroy', () => {
    window.removeEventListener('resize', resize)
    window.removeEventListener('orientationchange', resize)
    window.visualViewport?.removeEventListener('resize', resize)
  })
  resize()
  window.setTimeout(resize, 100)
  window.setTimeout(resize, 300)
  window.setTimeout(resize, 600)
}

function layoutEndCardStage(stage) {
  const resize = () => {
    const viewWidth = Math.max(window.visualViewport?.width || window.innerWidth, 1)
    const viewHeight = Math.max(window.visualViewport?.height || window.innerHeight, 1)
    const baseScale = Math.min(viewWidth / WIDTH, viewHeight / HEIGHT)
    const scale = baseScale + VIEWPORT_OVERSCAN_X / WIDTH
    stage.style.transform = `translate(-50%, -50%) scale(${scale})`
  }

  window.addEventListener('resize', resize)
  window.addEventListener('orientationchange', resize)
  window.visualViewport?.addEventListener('resize', resize)
  resize()
  window.setTimeout(resize, 100)
  window.setTimeout(resize, 300)
  window.setTimeout(resize, 600)
}

function setupEndCard() {
  const endCard = document.getElementById('end-card')
  const stage = endCard.querySelector('.end-card__stage')
  const bg = document.getElementById('end-card-bg')
  const logo = document.getElementById('end-card-logo')
  const cta = document.getElementById('end-card-cta')
  const stickers = document.getElementById('end-card-stickers')

  layoutEndCardStage(stage)
  bg.src = SPRITES.bgColor
  bg.style.width = '1200px'
  bg.style.height = `${HEIGHT}px`
  bg.style.left = '50%'
  bg.style.transform = 'translateX(-50%)'
  logo.src = SPRITES.logo
  cta.src = SPRITES.cta
  stickers.textContent = ''

  const fitStickerImage = (img, maxSize) => {
    const applySize = () => {
      if (!img.naturalWidth || !img.naturalHeight) return
      const ratio = maxSize
        ? Math.min(maxSize / img.naturalWidth, maxSize / img.naturalHeight)
        : 1
      img.style.width = `${img.naturalWidth * ratio}px`
      img.style.height = `${img.naturalHeight * ratio}px`
    }

    if (img.complete) {
      applySize()
    } else {
      img.addEventListener('load', applySize, { once: true })
    }
  }

  STICKERS.forEach((sticker) => {
    const img = document.createElement('img')
    const layout = getStickerLayout(sticker)
    img.className = 'end-card__sticker'
    img.src = COLORED[sticker.id]
    img.alt = ''
    img.draggable = false
    img.style.left = `${sticker.x}px`
    img.style.top = `${sticker.y}px`
    img.style.zIndex = String(layout.z)
    fitStickerImage(img, sticker.placedMax)
    stickers.appendChild(img)
  })

  endCard.addEventListener('click', triggerCTA)
  return {
    show() {
      endCard.style.opacity = ''
      endCard.style.pointerEvents = ''
      endCard.classList.add('end-card--visible')
      notifyEndcardShown()
    },
  }
}

function createGame() {
  const app = document.getElementById('app')
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: document.getElementById('game'),
    width: WIDTH,
    height: HEIGHT,
    transparent: false,
    backgroundColor: '#ffffff',
    scene: [PreloaderScene, StickerBookScene],
    scale: {
      mode: Phaser.Scale.NONE,
      width: WIDTH,
      height: HEIGHT,
    },
    render: {
      antialias: true,
      pixelArt: false,
    },
    input: {
      activePointers: 3,
      touch: {
        capture: true,
      },
    },
  })

  layoutCanvas(game)
  game.events.once('game-scene-ready', () => {
    app?.classList.add('app--game-layout')
  })
  game.events.on('tutorial-overlay-shown', () => {
    app?.classList.add('app--tutorial-overlay')
  })
  game.events.on('tutorial-overlay-hidden', () => {
    app?.classList.remove('app--tutorial-overlay')
  })
  game.events.once('destroy', () => {
    app?.classList.remove('app--tutorial-overlay')
  })
  bindLifecycle(game)
  return game
}

async function boot() {
  installLifecycleStubs()
  await Promise.all([waitForDomReady(), mraidReady])
  const endCard = setupEndCard()
  const game = SKIP_TO_ENDCARD ? null : createGame()

  if (game) {
    game.events.once('assets-loaded', notifyGameReady)
    game.events.once('game-started', notifyGameStart)
    game.events.once('game-finished', notifyGameEnd)
    game.events.once('game-complete', () => endCard.show())
  } else {
    endCard.show()
    notifyGameReady()
  }
}

boot()
