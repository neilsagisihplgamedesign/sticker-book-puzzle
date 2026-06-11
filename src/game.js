import Phaser from 'phaser'
import {
  ACTIVE_DRAG_DEPTH,
  ACTIVE_ITERATION,
  BURST_DEPTH,
  GAME_END_DELAY,
  GAME_BOTTOM_BACKGROUND_COLOR,
  HEIGHT,
  INACTIVITY_HINT_DELAY,
  ROUNDS,
  SHOW_ALL_NUMBERED_ITEMS_FOR_LAYOUT,
  STICKERS,
  TUTORIAL_OVERLAY_ALPHA,
  TRAY_BADGE_LOCAL_OFFSET_Y,
  TRAY_BADGE_OFFSET_X,
  TRAY_BADGE_OFFSET_Y,
  TRAY_BACKGROUND_DEPTH,
  TRAY_CENTER_Y,
  TRAY_HEIGHT,
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
  }

  create() {
    this.sound.pauseOnBlur = false
    this.bgm = this.sound.add('bgm', { loop: true, volume: 0.18 })
    this.correctSfx = this.sound.add('correct', { volume: 0.65 })
    this.wrongSfx = this.sound.add('wrong', { volume: 0.42 })
    this.finishedSfx = this.sound.add('finished', { volume: 0.8 })

    this.add.image(WIDTH / 2, 0, 'bgWhite').setOrigin(0.5, 0).setDisplaySize(1200, HEIGHT)
    this.colorBg = this.add.image(WIDTH / 2, 0, 'bgColor').setOrigin(0.5, 0).setDisplaySize(1200, HEIGHT).setAlpha(0)
    this.add.rectangle(0, TRAY_TOP_Y, WIDTH, HEIGHT - TRAY_TOP_Y, GAME_BOTTOM_BACKGROUND_COLOR)
      .setOrigin(0, 0)
      .setDepth(TRAY_BACKGROUND_DEPTH - 1)
    this.add.image(WIDTH / 2, TRAY_CENTER_Y, 'tray').setDisplaySize(WIDTH, TRAY_HEIGHT).setDepth(TRAY_BACKGROUND_DEPTH)

    this.hintLayer = this.add.container(0, 0).setDepth(20)
    this.dragLayer = this.add.container(0, 0).setDepth(TRAY_ITEM_DEPTH)

    this.input.on('pointermove', this.onPointerMove, this)
    this.input.on('pointerup', this.onPointerUp, this)
    this.input.on('pointerupoutside', this.onPointerUp, this)
    this.startRound(0)
    this.game.events.emit('game-scene-ready')
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
    const overlay = this.add.renderTexture(0, 0, WIDTH, HEIGHT)
      .setOrigin(0, 0)
      .setDepth(ACTIVE_DRAG_DEPTH)
    overlay.fill(0x000000, TUTORIAL_OVERLAY_ALPHA)
    this.eraseSpriteShapeFromOverlay(overlay, traySprite, first.x, first.y)
    if (trayBadge) {
      overlay.erase(trayBadge)
      this.eraseCircleFromOverlay(overlay, first.x + trayBadge.x, first.y + trayBadge.y, 56)
    }

    if (targetData) {
      this.eraseSpriteShapeFromOverlay(overlay, targetData.target, targetData.sticker.x, targetData.sticker.y)
      overlay.erase(targetData.label)
    }

    this.tutorialOverlay = overlay
  }

  eraseSpriteShapeFromOverlay(overlay, source, x, y) {
    if (!source?.texture?.key) return

    const temp = this.make.image({ x, y, key: source.texture.key, add: false })
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
    cutout.fillCircle(x, y, radius)
    overlay.erase(cutout)
    cutout.destroy()
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
    const canvas = this.game.canvas
    const rect = canvas.getBoundingClientRect()
    const event = pointer.event
    const source = event?.changedTouches?.[0] || event?.touches?.[0] || event
    const clientX = source?.clientX ?? pointer.x
    const clientY = source?.clientY ?? pointer.y
    return {
      x: Phaser.Math.Clamp(((clientX - rect.left) / rect.width) * WIDTH, 0, WIDTH),
      y: Phaser.Math.Clamp(((clientY - rect.top) / rect.height) * HEIGHT, 0, HEIGHT),
    }
  }

  onTrayPointerDown(pointer, sprite) {
    pointer.event?.preventDefault?.()
    this.registerActivity()
    const position = this.getPointerGamePosition(pointer)
    if (!this.hasStarted) {
      this.hasStarted = true
      this.game.events.emit('game-started')
      this.startIterationTimer()
    }
    if (!this.bgm.isPlaying) this.bgm.play()
    this.clearHandHint()
    sprite.setDepth(ACTIVE_DRAG_DEPTH).setScale(sprite.getData('homeScale') * 1.08)
    this.activeDrag = {
      pointerId: pointer.id,
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
    this.scheduleInactivityHint()
    const { sprite } = this.activeDrag
    this.activeDrag = null
    const id = sprite.getData('id')
    const targetData = this.activeTargets.get(id)
    if (!targetData) return

    const distance = Phaser.Math.Distance.Between(sprite.x, sprite.y, targetData.sticker.x, targetData.sticker.y)
    if (distance < 145) {
      this.placeSticker(sprite, targetData)
      return
    }

    this.wrongSfx.play()
    this.tweens.add({
      targets: sprite,
      x: sprite.getData('homeX'),
      y: sprite.getData('homeY'),
      scale: sprite.getData('homeScale'),
      duration: 230,
      ease: 'Back.Out',
      onComplete: () => {
        sprite.setDepth(TRAY_ITEM_DEPTH)
      },
    })
  }

  placeSticker(sprite, targetData) {
    const { sticker, target, label } = targetData
    const stickerSprite = sprite.getData('sprite')
    const badge = sprite.getData('badge')
    this.correctSfx.play()
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
      },
    })

    this.placedIds.add(sticker.id)
    this.activeTargets.delete(sticker.id)
    this.clearHandHint()
    this.scheduleInactivityHint()

    if (this.activeTargets.size === 0) {
      this.time.delayedCall(520, () => this.advanceRound())
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
    this.bgm.stop()
    this.finishedSfx.play()
    this.showRemainingStickers()
    this.game.events.emit('game-finished')
    this.tweens.add({ targets: this.colorBg, alpha: 1, duration: 540, ease: 'Sine.InOut' })
    this.time.delayedCall(GAME_END_DELAY, () => {
      this.game.events.emit('game-complete')
    })
  }
}
