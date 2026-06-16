import Phaser from 'phaser'
import './styles.css'
import { COLORED, SPRITES } from './assets.js'
import {
  GAME_BOTTOM_BACKGROUND_CSS,
  HEIGHT,
  ROOM_LINE_CSS,
  ROOM_LINE_EXTENSION_LEFT_OVERLAP_PX,
  ROOM_LINE_EXTENSION_RIGHT_OVERLAP_PX,
  ROOM_LINE_EXTENSION_THICKNESS_PX,
  ROOM_LINE_EXTENSION_Y_OFFSET_PX,
  ROOM_LINE_Y,
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
    const viewAspect = viewWidth / viewHeight
    const designAspect = WIDTH / HEIGHT
    const internalWidth = viewAspect >= designAspect ? HEIGHT * viewAspect : WIDTH
    const internalHeight = viewAspect >= designAspect ? HEIGHT : WIDTH / viewAspect
    const renderWidth = Math.ceil(internalWidth)
    const renderHeight = Math.ceil(internalHeight)
    const canvasWidth = Math.ceil(viewWidth) + VIEWPORT_OVERSCAN_X
    const canvasHeight = Math.ceil(viewHeight)
    const offsetX = (renderWidth - WIDTH) / 2
    const offsetY = (renderHeight - HEIGHT) / 2
    const scaleX = canvasWidth / renderWidth
    const scaleY = canvasHeight / renderHeight
    const scale = Math.min(scaleX, scaleY)
    const app = document.getElementById('app')

    app?.style.setProperty('--game-tray-top-y', `${Math.round((offsetY + TRAY_TOP_Y) * scaleY)}px`)
    app?.style.setProperty('--game-bottom-bg', GAME_BOTTOM_BACKGROUND_CSS)
    const gameRoomLineY = Math.floor((offsetY + ROOM_LINE_Y) * scaleY) + ROOM_LINE_EXTENSION_Y_OFFSET_PX
    const gameRoomLineThickness = Math.max(1, Math.round(ROOM_LINE_EXTENSION_THICKNESS_PX * scaleY))
    app?.style.setProperty('--game-room-line-y', `${gameRoomLineY}px`)
    app?.style.setProperty('--game-room-line-thickness', `${gameRoomLineThickness}px`)
    app?.style.setProperty('--game-room-line-color', ROOM_LINE_CSS)
    app?.style.setProperty('--room-line-left-overlap', `${ROOM_LINE_EXTENSION_LEFT_OVERLAP_PX}px`)
    app?.style.setProperty('--room-line-right-overlap', `${ROOM_LINE_EXTENSION_RIGHT_OVERLAP_PX}px`)
    const boardLeft = Math.floor(-1 + offsetX * scaleX)
    const boardTop = Math.floor(offsetY * scaleY)
    const boardWidth = Math.ceil(WIDTH * scaleX)
    const boardHeight = Math.ceil(HEIGHT * scaleY)

    app?.style.setProperty('--game-board-left', `${boardLeft}px`)
    app?.style.setProperty('--game-board-top', `${boardTop}px`)
    app?.style.setProperty('--game-board-width', `${boardWidth}px`)
    app?.style.setProperty('--game-board-height', `${boardHeight}px`)
    app?.style.setProperty('--game-board-right', `${Math.max(canvasWidth - boardLeft - boardWidth, 0)}px`)
    app?.style.setProperty('--game-board-bottom', `${Math.max(canvasHeight - boardTop - boardHeight, 0)}px`)

    const viewport = {
      internalWidth: renderWidth,
      internalHeight: renderHeight,
      offsetX,
      offsetY,
      scale,
    }

    game.registry.set('viewport', viewport)
    game.scale.resize(renderWidth, renderHeight)
    game.events.emit('viewport-resized', viewport)

    const canvas = game.canvas
    if (canvas) {
      canvas.style.width = `${canvasWidth}px`
      canvas.style.height = `${canvasHeight}px`
      canvas.style.marginLeft = '-1px'
      canvas.style.marginTop = '0'
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

function layoutEndCardStage(stage, endCard) {
  const resize = () => {
    const viewWidth = Math.max(window.visualViewport?.width || window.innerWidth, 1)
    const viewHeight = Math.max(window.visualViewport?.height || window.innerHeight, 1)
    const baseScale = Math.min(viewWidth / WIDTH, viewHeight / HEIGHT)
    const scale = baseScale + VIEWPORT_OVERSCAN_X / WIDTH
    const stageWidth = WIDTH * scale
    const stageLeft = Math.max((viewWidth - stageWidth) / 2, 0)
    const stageRight = Math.max(viewWidth - stageLeft - stageWidth, 0)
    const stageTop = (viewHeight - HEIGHT * scale) / 2
    const roomLineY = Math.floor(stageTop + ROOM_LINE_Y * scale) + ROOM_LINE_EXTENSION_Y_OFFSET_PX
    const roomLineThickness = Math.max(1, Math.round(ROOM_LINE_EXTENSION_THICKNESS_PX * scale))
    const app = document.getElementById('app')

    app?.style.setProperty('--end-card-stage-left', `${Math.floor(stageLeft)}px`)
    app?.style.setProperty('--end-card-stage-right', `${Math.floor(stageRight)}px`)
    app?.style.setProperty('--room-line-left-overlap', `${ROOM_LINE_EXTENSION_LEFT_OVERLAP_PX}px`)
    app?.style.setProperty('--room-line-right-overlap', `${ROOM_LINE_EXTENSION_RIGHT_OVERLAP_PX}px`)
    app?.style.setProperty('--end-card-room-line-y', `${roomLineY}px`)
    app?.style.setProperty('--end-card-room-line-thickness', `${roomLineThickness}px`)
    endCard?.style.setProperty('--end-card-stage-left', `${Math.floor(stageLeft)}px`)
    endCard?.style.setProperty('--end-card-stage-right', `${Math.floor(stageRight)}px`)
    endCard?.style.setProperty('--room-line-left-overlap', `${ROOM_LINE_EXTENSION_LEFT_OVERLAP_PX}px`)
    endCard?.style.setProperty('--room-line-right-overlap', `${ROOM_LINE_EXTENSION_RIGHT_OVERLAP_PX}px`)
    endCard?.style.setProperty('--end-card-room-line-y', `${roomLineY}px`)
    endCard?.style.setProperty('--end-card-room-line-thickness', `${roomLineThickness}px`)
    endCard?.style.setProperty('--end-card-stage-scale', String(scale))
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

  layoutEndCardStage(stage, endCard)
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
      const app = document.getElementById('app')
      app?.classList.remove('app--game-end-layout')
      app?.classList.add('app--end-card-layout')
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
    transparent: true,
    backgroundColor: 'rgba(255,255,255,0)',
    scene: [PreloaderScene, StickerBookScene],
    audio: {
      disableWebAudio: true,
    },
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
    game.events.once('game-finished', () => {
      document.getElementById('app')?.classList.add('app--game-end-layout')
      notifyGameEnd()
    })
    game.events.once('game-complete', () => endCard.show())
  } else {
    endCard.show()
    notifyGameReady()
  }
}

boot()
