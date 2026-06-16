import Phaser from 'phaser'
import { AUDIO } from './assets.js'
import {
  ACTIVE_DRAG_DEPTH,
  ACTIVE_ITERATION,
  BURST_DEPTH,
  GAME_END_DELAY,
  GAME_BOTTOM_BACKGROUND_COLOR,
  HEIGHT,
  INACTIVITY_HINT_DELAY,
  ROUNDS,
  ROOM_LINE_COUCH_MASK_COLOR,
  ROOM_LINE_COUCH_MASK_DEPTH,
  ROOM_LINE_COUCH_MASK_HEIGHT,
  ROOM_LINE_COUCH_MASK_SEGMENTS,
  ROOM_LINE_COUCH_MASK_Y,
  ROOM_LINE_COVER_COLOR,
  ROOM_LINE_COVER_DEPTH,
  ROOM_LINE_COVER_ENABLED,
  ROOM_LINE_COVER_HEIGHT,
  ROOM_LINE_COVER_SEGMENTS,
  ROOM_LINE_COVER_Y,
  SHOW_ALL_NUMBERED_ITEMS_FOR_LAYOUT,
  STICKERS,
  TUTORIAL_OVERLAY_ALPHA,
  TRAY_BADGE_LOCAL_OFFSET_Y,
  TRAY_BADGE_OFFSET_X,
  TRAY_BADGE_OFFSET_Y,
  TRAY_BACKGROUND_DEPTH,
  TRAY_ITEM_DEPTH,
  TRAY_ITEM_HEIGHT,
  TRAY_TOP_Y,
  TRAY_TOUCH_PADDING,
  WIDTH,
  getStickerLayout,
} from './constants.js'

export class StickerBookScene extends Phaser.Scene {
  constructor() {
    super('StickerBookScene')
    this.roundIndex = 0
    this.placedIds = new Set()
    this.activeTargets = new Map()
    this.trayStickers = []
    this.targetItems = []
    this.completed = false
    this.hasStarted = false
    this.activeDrag = null
    this.tutorialOverlay = null
    this.inactivityTimer = null
    this.handHint = null
    this.handHintTween = null
    this.iterationTimer = null
    this.moveCount = 0
    this.viewport = {
      internalWidth: WIDTH,
      internalHeight: HEIGHT,
      offsetX: 0,
      offsetY: 0,
      scale: 1,
    }
  }

  create() {
    this.sound.pauseOnBlur = false
    this.bgm = new Audio(AUDIO.bgm)
    this.bgm.loop = true
    this.bgm.volume = 0.18
    this.bgm.preload = 'auto'
    this.audioUnlocked = false
    this.bgmPrimed = false
    this.bgmStarted = false
    this.bgmStartAttempts = 0

    this.bgWhite = this.add.image(WIDTH / 2, 0, 'bgWhite')
      .setOrigin(0.5, 0)
      .setDisplaySize(1200, HEIGHT)
      .setDepth(0)
    this.roomLineCovers = this.createRoomLineCovers()
    this.colorBg = this.add.image(WIDTH / 2, 0, 'bgColor')
      .setOrigin(0.5, 0)
      .setDisplaySize(1200, HEIGHT)
      .setAlpha(0)
      .setDepth(ROOM_LINE_COUCH_MASK_DEPTH + 0.01)
    this.bottomBg = this.add.rectangle(WIDTH / 2, TRAY_TOP_Y, WIDTH, HEIGHT - TRAY_TOP_Y, GAME_BOTTOM_BACKGROUND_COLOR)
      .setOrigin(0.5, 0)
      .setDepth(TRAY_BACKGROUND_DEPTH - 1)
    this.hintLayer = this.add.container(0, 0).setDepth(20)
    this.dragLayer = this.add.container(0, 0).setDepth(TRAY_ITEM_DEPTH)

    this.input.on('pointermove', this.onPointerMove, this)
    this.input.on('pointerup', this.onPointerUp, this)
    this.input.on('pointerupoutside', this.onPointerUp, this)
    this.game.events.on('viewport-resized', this.applyViewport, this)
    this.applyViewport(this.game.registry.get('viewport') || this.viewport)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('viewport-resized', this.applyViewport, this)
    })
    this.startRound(0)
    this.game.events.emit('game-scene-ready')
  }

  applyViewport(viewport) {
    const hadTutorialOverlay = Boolean(this.tutorialOverlay)
    this.viewport = viewport
    this.cameras.main.setViewport(0, 0, viewport.internalWidth, viewport.internalHeight)
    this.cameras.main.setScroll(-viewport.offsetX, -viewport.offsetY)
    this.layoutViewportBackgrounds()
    if (hadTutorialOverlay) {
      this.showTutorialOverlay()
    }
  }

  layoutViewportBackgrounds() {
    this.bgWhite?.setDisplaySize(WIDTH, HEIGHT)
    this.colorBg?.setDisplaySize(WIDTH, HEIGHT)
    this.bottomBg?.setSize(WIDTH, HEIGHT - TRAY_TOP_Y)
    this.layoutRoomLineCovers()
  }

  createRoomLineCovers() {
    if (!ROOM_LINE_COVER_ENABLED) return []

    const blackLine = this.createRoomLineRectangles(
      ROOM_LINE_COVER_SEGMENTS,
      ROOM_LINE_COVER_Y,
      ROOM_LINE_COVER_HEIGHT,
      ROOM_LINE_COVER_COLOR,
      ROOM_LINE_COVER_DEPTH,
      'line',
    )
    const couchMask = this.createRoomLineRectangles(
      ROOM_LINE_COUCH_MASK_SEGMENTS,
      ROOM_LINE_COUCH_MASK_Y,
      ROOM_LINE_COUCH_MASK_HEIGHT,
      ROOM_LINE_COUCH_MASK_COLOR,
      ROOM_LINE_COUCH_MASK_DEPTH,
      'couch-mask',
    )

    return [...blackLine, ...couchMask]
  }

  createRoomLineRectangles(segments, y, height, color, depth, type) {
    return segments.map((segment) => this.add.rectangle(
      segment.x,
      y,
      segment.width,
      height,
      color,
    )
      .setOrigin(0, 0.5)
      .setDepth(depth)
      .setData('roomLineType', type))
  }

  layoutRoomLineCovers() {
    if (!this.roomLineCovers?.length) return

    this.roomLineCovers.forEach((line) => {
      if (line.getData('roomLineType') !== 'line') return

      line
        .setPosition(-this.viewport.offsetX, ROOM_LINE_COVER_Y)
        .setSize(this.viewport.internalWidth, ROOM_LINE_COVER_HEIGHT)
    })
  }

  hideRoomLineCovers() {
    this.roomLineCovers?.forEach((line) => line.setVisible(false))
  }

  startRound(index) {
    this.roundIndex = index
    this.clearInactivityTimer()
    this.clearHandHint()
    this.clearTutorialOverlay()
    this.activeTargets.clear()
    this.trayStickers.forEach((sprite) => sprite.destroy())
    this.trayStickers = []
    this.targetItems.forEach((item) => item.destroy())
    this.targetItems = []
    this.hintLayer.removeAll(true)

    const round = SHOW_ALL_NUMBERED_ITEMS_FOR_LAYOUT ? STICKERS.map((sticker) => sticker.id) : ROUNDS[index] || []

    round.forEach((id) => {
      const sticker = STICKERS.find((item) => item.id === id)
      const layout = getStickerLayout(sticker)
      const target = this.add.image(sticker.x, sticker.y, `target-${id}`).setDepth(layout.z)
      this.fitSpriteToMax(target, sticker.targetMax)
      const targetScale = target.scaleX
      this.tweens.add({
        targets: target,
        scale: targetScale * 1.08,
        duration: 260,
        ease: 'Back.Out',
      })
      const label = this.createTargetNumberLabel(
        sticker.x + layout.labelX,
        sticker.y + layout.labelY,
        id,
      ).setDepth(layout.z + 0.1)

      this.targetItems.push(target, label)
      this.activeTargets.set(id, { sticker, target, label })
    })

    if (SHOW_ALL_NUMBERED_ITEMS_FOR_LAYOUT) {
      this.clearHandHint()
      return
    }

    const trayY = HEIGHT - 40 + TRAY_BADGE_OFFSET_Y
    const spacing = 340
    const startX = WIDTH / 2 - spacing
    round.forEach((id, slotIndex) => {
      const x = startX + slotIndex * spacing
      const trayItem = this.createTrayItem(id, x, trayY)
      trayItem.setDepth(TRAY_ITEM_DEPTH + slotIndex)
      this.dragLayer.add(trayItem)
      this.trayStickers.push(trayItem)
    })

    this.showTutorialHint()
  }

  fitSpriteToMax(sprite, maxSize) {
    if (!maxSize) {
      sprite.setScale(1)
      return
    }
    const texture = this.textures.get(sprite.texture.key).getSourceImage()
    const ratio = Math.min(maxSize / texture.width, maxSize / texture.height)
    sprite.setScale(ratio)
  }

  fitSpriteToHeight(sprite, height) {
    const texture = this.textures.get(sprite.texture.key).getSourceImage()
    sprite.setScale(height / texture.height)
  }

  createNumberBadge(x, y, id) {
    const badge = this.add.container(x, y)
    const circle = this.add.graphics()
    circle.fillStyle(0xffffff, 1)
    circle.fillCircle(0, 0, 45)
    circle.lineStyle(8, 0x111111, 1)
    circle.strokeCircle(0, 0, 45)
    const label = this.add.text(0, 1, String(id), {
      fontFamily: 'Arial, sans-serif',
      fontSize: '45px',
      color: '#111111',
    }).setOrigin(0.5)
    badge.add([circle, label])
    badge.setData('id', id)
    return badge
  }

  createTrayItem(id, x, y) {
    const sprite = this.add.image(0, 0, `drag-${id}`)
    this.fitSpriteToHeight(sprite, TRAY_ITEM_HEIGHT)

    const badge = this.createNumberBadge(TRAY_BADGE_OFFSET_X, TRAY_BADGE_LOCAL_OFFSET_Y, id)
    const item = this.add.container(x, y, [sprite, badge])
      .setData('id', id)
      .setData('sprite', sprite)
      .setData('badge', badge)
      .setData('homeX', x)
      .setData('homeY', y)
      .setData('homeScale', 1)

    const texture = this.textures.get(sprite.texture.key).getSourceImage()
    const hitWidth = Math.max(220, texture.width * sprite.scaleX)
    const badgeReachX = Math.abs(TRAY_BADGE_OFFSET_X) + 96
    const badgeReachY = Math.abs(TRAY_BADGE_LOCAL_OFFSET_Y) + 96
    const hitHeight = Math.max(TRAY_ITEM_HEIGHT, texture.height * sprite.scaleY, badgeReachY)
    item.setInteractive(
      new Phaser.Geom.Rectangle(
        -Math.max(hitWidth, badgeReachX) / 2 - TRAY_TOUCH_PADDING,
        -hitHeight / 2 - TRAY_TOUCH_PADDING,
        Math.max(hitWidth, badgeReachX) + TRAY_TOUCH_PADDING * 2,
        hitHeight + TRAY_TOUCH_PADDING * 2,
      ),
      Phaser.Geom.Rectangle.Contains,
    )
    item.on('pointerdown', (pointer) => this.onTrayPointerDown(pointer, item))
    return item
  }

  createTargetNumberLabel(x, y, id) {
    return this.add.text(x, y, String(id), {
      fontFamily: 'Arial, sans-serif',
      fontSize: '30px',
      color: '#111111',
    }).setOrigin(0.5)
  }

  createHandHint() {
    this.clearHandHint()
    if (!this.trayStickers.length) return

    const first = this.trayStickers[0]
    const target = this.activeTargets.get(first.getData('id'))?.sticker
    if (!target) return
    const hand = this.add.image(first.x + 75, first.y - 18, 'hand')
      .setDisplaySize(122, 111)
      .setDepth(ACTIVE_DRAG_DEPTH + 1)
    this.handHint = hand

    this.handHintTween = this.tweens.add({
      targets: hand,
      x: target.x + 72,
      y: target.y + 72,
      duration: 1150,
      ease: 'Sine.InOut',
      repeat: -1,
      repeatDelay: 250,
      onRepeat: () => {
        if (hand.active) {
          hand.setPosition(first.x + 75, first.y - 18).setAlpha(1)
        }
      },
    })
  }

  clearHandHint() {
    this.handHintTween?.remove()
    this.handHintTween = null
    this.handHint?.destroy()
    this.handHint = null
  }

  showTutorialOverlay() {
    this.tutorialOverlay?.destroy()
    if (!this.trayStickers.length) return
    this.game.events.emit('tutorial-overlay-shown')

    const first = this.trayStickers[0]
    const traySprite = first.getData('sprite')
    const trayBadge = first.getData('badge')
    const targetData = this.activeTargets.get(first.getData('id'))
    const camera = this.cameras.main
    const overlayOverscan = 24
    const overlay = this.add.renderTexture(
      -overlayOverscan,
      -overlayOverscan,
      camera.width + overlayOverscan * 2,
      camera.height + overlayOverscan * 2,
    )
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(ACTIVE_DRAG_DEPTH)
    overlay.setData('overscan', overlayOverscan)
    this.tutorialOverlay = overlay
    overlay.fill(0x000000, TUTORIAL_OVERLAY_ALPHA)
    this.eraseSpriteShapeFromOverlay(overlay, traySprite, first.x, first.y)
    if (trayBadge) {
      this.eraseCircleFromOverlay(overlay, first.x + trayBadge.x, first.y + trayBadge.y, 56)
    }

    if (targetData) {
      this.eraseSpriteShapeFromOverlay(overlay, targetData.target, targetData.sticker.x, targetData.sticker.y)
      this.eraseCircleFromOverlay(overlay, targetData.label.x, targetData.label.y, 34)
    }
  }

  eraseSpriteShapeFromOverlay(overlay, source, x, y) {
    if (!source?.texture?.key) return

    const temp = this.make.image({
      x: this.worldToOverlayX(x),
      y: this.worldToOverlayY(y),
      key: source.texture.key,
      add: false,
    })
    temp
      .setOrigin(source.originX, source.originY)
      .setScale(source.scaleX, source.scaleY)
      .setRotation(source.rotation)
    overlay.erase(temp)
    temp.destroy()
  }

  eraseCircleFromOverlay(overlay, x, y, radius) {
    const cutout = this.make.graphics({ add: false })
    cutout.fillStyle(0xffffff, 1)
    cutout.fillCircle(this.worldToOverlayX(x), this.worldToOverlayY(y), radius)
    overlay.erase(cutout)
    cutout.destroy()
  }

  worldToOverlayX(x) {
    return x - this.cameras.main.scrollX + (this.tutorialOverlay?.getData('overscan') || 0)
  }

  worldToOverlayY(y) {
    return y - this.cameras.main.scrollY + (this.tutorialOverlay?.getData('overscan') || 0)
  }

  showTutorialHint() {
    if (!this.hasStarted) {
      this.showTutorialOverlay()
      this.createHandHint()
    }
    this.scheduleInactivityHint()
  }

  clearTutorialOverlay() {
    if (this.tutorialOverlay) {
      this.game.events.emit('tutorial-overlay-hidden')
    }
    this.tutorialOverlay?.destroy()
    this.tutorialOverlay = null
  }

  clearInactivityTimer() {
    this.inactivityTimer?.remove(false)
    this.inactivityTimer = null
  }

  scheduleInactivityHint() {
    this.clearInactivityTimer()
    if (this.completed || SHOW_ALL_NUMBERED_ITEMS_FOR_LAYOUT || !this.trayStickers.length) return

    this.inactivityTimer = this.time.delayedCall(INACTIVITY_HINT_DELAY, () => {
      if (!this.activeDrag && this.trayStickers.length && !this.completed) {
        this.createHandHint()
      }
    })
  }

  registerActivity() {
    this.clearTutorialOverlay()
    this.clearHandHint()
    this.scheduleInactivityHint()
  }

  getPointerGamePosition(pointer) {
    const client = this.getPointerClientPosition(pointer)
    return this.clientToGamePosition(client.clientX, client.clientY)
  }

  getPointerClientPosition(pointer) {
    const event = pointer.event
    const source = event?.changedTouches?.[0] || event?.touches?.[0] || event
    return {
      clientX: source?.clientX ?? pointer.x,
      clientY: source?.clientY ?? pointer.y,
    }
  }

  clientToGamePosition(clientX, clientY) {
    const canvas = this.game.canvas
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((clientX - rect.left) / rect.width) * this.viewport.internalWidth - this.viewport.offsetX,
      y: ((clientY - rect.top) / rect.height) * this.viewport.internalHeight - this.viewport.offsetY,
    }
  }

  isClientInsideCanvas(clientX, clientY) {
    const position = this.clientToGamePosition(clientX, clientY)
    return position.x >= 0 && position.x <= WIDTH && position.y >= 0 && position.y <= HEIGHT
  }

  unlockHtml5AudioTags() {
    if (this.audioUnlocked) return

    this.game.cache.audio.entries.each((key, tags) => {
      tags.forEach((tag) => {
        tag.dataset.locked = 'false'
        tag.preload = 'auto'
        if (tag.readyState < 2) {
          tag.load()
        }
      })

      return true
    })

    if (Array.isArray(this.sound.lockedActionsQueue)) {
      this.sound.lockedActionsQueue.length = 0
    }

    this.sound.locked = false
    this.audioUnlocked = true
  }

  primeAudioOnDragStart() {
    this.unlockHtml5AudioTags()
    this.primeBgmOnDragStart()
  }

  safePlay(key, config = {}) {
    if (this.sound.mute) return false

    this.unlockHtml5AudioTags()

    return this.sound.play(key, config)
  }

  safePlaySound(sound, config = {}) {
    if (!sound || this.sound.mute) return false

    this.unlockHtml5AudioTags()

    if (sound.isPlaying) return true

    return sound.play(config)
  }

  primeBgmOnDragStart() {
    if (this.bgmPrimed || this.bgmStarted || this.completed) return

    this.bgm.loop = true
    this.bgm.volume = 0
    const playResult = this.bgm.play()
    this.bgmPrimed = true

    playResult?.catch?.(() => {
      this.bgmPrimed = false
    })
  }

  onTrayPointerDown(pointer, sprite) {
    pointer.event?.preventDefault?.()
    const pointerId = pointer.event?.pointerId
    if (pointerId !== undefined) {
      this.game.canvas?.setPointerCapture?.(pointerId)
    }
    this.primeAudioOnDragStart()
    this.registerActivity()
    const position = this.getPointerGamePosition(pointer)
    if (!this.hasStarted) {
      this.hasStarted = true
      this.game.events.emit('game-started')
      this.startIterationTimer()
    }
    this.clearHandHint()
    sprite.setDepth(ACTIVE_DRAG_DEPTH).setScale(sprite.getData('homeScale') * 1.08)
    this.activeDrag = {
      pointerId: pointer.id,
      domPointerId: pointer.event?.pointerId,
      sprite,
      offsetX: sprite.x - position.x,
      offsetY: sprite.y - position.y,
    }
  }

  onPointerMove(pointer) {
    if (!this.activeDrag || this.activeDrag.pointerId !== pointer.id) return
    pointer.event?.preventDefault?.()
    this.scheduleInactivityHint()
    const position = this.getPointerGamePosition(pointer)
    this.activeDrag.sprite.setPosition(
      position.x + this.activeDrag.offsetX,
      position.y + this.activeDrag.offsetY,
    )
  }

  onPointerUp(pointer) {
    if (!this.activeDrag || this.activeDrag.pointerId !== pointer.id) return
    pointer.event?.preventDefault?.()
    const pointerId = pointer.event?.pointerId
    if (pointerId !== undefined) {
      this.game.canvas?.releasePointerCapture?.(pointerId)
    }
    this.scheduleInactivityHint()
    const { sprite } = this.activeDrag
    this.activeDrag = null
    const id = sprite.getData('id')
    const targetData = this.activeTargets.get(id)
    if (!targetData) return

    const { clientX, clientY } = this.getPointerClientPosition(pointer)
    const completeAfterMove = this.registerMoveAttempt()
    const distance = Phaser.Math.Distance.Between(sprite.x, sprite.y, targetData.sticker.x, targetData.sticker.y)
    if (this.isClientInsideCanvas(clientX, clientY) && distance < 145) {
      this.placeSticker(sprite, targetData, { completeAfterMove })
      return
    }

    this.safePlay('wrong', { volume: 0.42 })
    this.startBgmAfterFirstDrop()
    this.tweens.add({
      targets: sprite,
      x: sprite.getData('homeX'),
      y: sprite.getData('homeY'),
      scale: sprite.getData('homeScale'),
      duration: 230,
      ease: 'Back.Out',
      onComplete: () => {
        sprite.setDepth(TRAY_ITEM_DEPTH)
        if (completeAfterMove) {
          this.completeGame()
        }
      },
    })
  }

  registerMoveAttempt() {
    if (!ACTIVE_ITERATION.moveLimit || this.completed) return false

    this.moveCount += 1
    return this.moveCount >= ACTIVE_ITERATION.moveLimit
  }

  placeSticker(sprite, targetData, options = {}) {
    const { sticker, target, label } = targetData
    const { completeAfterMove = false } = options
    const stickerSprite = sprite.getData('sprite')
    const badge = sprite.getData('badge')
    this.safePlay('correct', { volume: 0.65 })
    this.startBgmAfterFirstDrop()
    sprite.disableInteractive()
    target.destroy()
    label.destroy()
    this.trayStickers = this.trayStickers.filter((traySprite) => traySprite !== sprite)
    badge.destroy()
    stickerSprite.setTexture(`color-${sticker.id}`)
    this.fitSpriteToMax(stickerSprite, sticker.placedMax)
    sprite.setScale(1)

    this.tweens.add({
      targets: sprite,
      x: sticker.x,
      y: sticker.y,
      duration: 180,
      ease: 'Back.Out',
      onComplete: () => {
        this.dragLayer.remove(sprite)
        this.add.existing(sprite)
        sprite.setDepth(getStickerLayout(sticker).z)
        const burst = this.add.image(sticker.x, sticker.y, 'burst')
          .setOrigin(0.5, 0.5)
          .setScale(0)
          .setDepth(BURST_DEPTH)
        this.tweens.add({
          targets: burst,
          scale: 1.5,
          alpha: 0,
          duration: 500,
          onComplete: () => burst.destroy(),
        })
        if (completeAfterMove) {
          this.completeGame()
        }
      },
    })

    this.placedIds.add(sticker.id)
    this.activeTargets.delete(sticker.id)
    this.clearHandHint()
    this.scheduleInactivityHint()

    if (!completeAfterMove && this.activeTargets.size === 0) {
      this.time.delayedCall(520, () => {
        if (!this.completed) {
          this.advanceRound()
        }
      })
    }
  }

  showRemainingStickers() {
    this.clearIterationTimer()
    this.clearInactivityTimer()
    this.clearTutorialOverlay()
    this.clearHandHint()
    this.trayStickers.forEach((sprite) => sprite.destroy())
    this.trayStickers = []
    this.activeTargets.forEach(({ target, label }) => {
      target?.destroy()
      label?.destroy()
    })
    this.activeTargets.clear()
    this.targetItems = []
    this.hintLayer.removeAll(true)

    STICKERS.forEach((sticker, index) => {
      if (this.placedIds.has(sticker.id)) return

      const sprite = this.add.image(sticker.x, sticker.y, `color-${sticker.id}`)
        .setDepth(getStickerLayout(sticker).z)
        .setAlpha(0)
      this.fitSpriteToMax(sprite, sticker.placedMax)
      const finalScale = sprite.scaleX
      sprite.setScale(finalScale * 0.82)
      this.tweens.add({
        targets: sprite,
        alpha: 1,
        scale: finalScale,
        duration: 260,
        delay: index * 12,
        ease: 'Back.Out',
      })
      this.placedIds.add(sticker.id)
    })
  }

  isTouchAudioEnvironment() {
    return navigator.maxTouchPoints > 0 || 'ontouchstart' in window
  }

  startBgmAfterFirstDrop() {
    if (this.bgmStarted || this.completed) return

    this.bgm.loop = true
    this.bgm.volume = 0.18
    const playResult = this.bgmPrimed && !this.bgm.paused ? true : this.bgm.play()

    if (playResult?.then) {
      playResult.then(() => {
        this.bgmStarted = true
      }).catch(() => {
        this.bgmStarted = false
      })
    } else {
      this.bgmStarted = playResult !== false || !this.bgm.paused
    }

    if (!this.bgmStarted && this.bgmStartAttempts < 5) {
      this.bgmStartAttempts += 1
      this.time.delayedCall(120, () => this.startBgmAfterFirstDrop())
    }
  }

  advanceRound() {
    if (this.roundIndex < ROUNDS.length - 1) {
      this.startRound(this.roundIndex + 1)
      return
    }

    this.completeGame()
  }

  startIterationTimer() {
    this.clearIterationTimer()
    if (!ACTIVE_ITERATION.timeLimitMs) return

    this.iterationTimer = this.time.delayedCall(ACTIVE_ITERATION.timeLimitMs, () => {
      this.completeGame()
    })
  }

  clearIterationTimer() {
    this.iterationTimer?.remove(false)
    this.iterationTimer = null
  }

  completeGame() {
    if (this.completed) return
    this.completed = true
    this.unlockHtml5AudioTags()
    this.bgm.pause()
    this.bgm.currentTime = 0
    this.safePlay('finished', { volume: 0.8 })
    this.hideRoomLineCovers()
    this.showRemainingStickers()
    this.game.events.emit('game-finished')
    this.tweens.add({ targets: this.colorBg, alpha: 1, duration: 540, ease: 'Sine.InOut' })
    this.time.delayedCall(GAME_END_DELAY, () => {
      this.game.events.emit('game-complete')
    })
  }
}
