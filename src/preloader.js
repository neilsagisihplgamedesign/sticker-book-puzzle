import Phaser from 'phaser'
import { AUDIO, COLORED, DRAGGABLE, NUMBERED, SPRITES } from './assets.js'
import { STICKERS } from './constants.js'

export class PreloaderScene extends Phaser.Scene {
  constructor() {
    super('PreloaderScene')
  }

  preload() {
    this.load.image('bgWhite', SPRITES.bgWhite)
    this.load.image('bgColor', SPRITES.bgColor)
    this.load.image('tray', SPRITES.tray)
    this.load.image('hand', SPRITES.hand)
    this.load.image('burst', SPRITES.burst)

    STICKERS.forEach((sticker) => {
      this.load.image(`color-${sticker.id}`, COLORED[sticker.id])
      this.load.image(`drag-${sticker.id}`, DRAGGABLE[sticker.id])
      this.load.image(`target-${sticker.id}`, NUMBERED[sticker.id])
    })

    this.load.audio('correct', AUDIO.correct)
    this.load.audio('wrong', AUDIO.wrong)
    this.load.audio('finished', AUDIO.finished)
    this.load.audio('bgm', AUDIO.bgm)
  }

  create() {
    this.game.events.emit('assets-loaded')
    this.scene.start('StickerBookScene')
  }
}
