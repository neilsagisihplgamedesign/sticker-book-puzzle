export const WIDTH = 1080
export const HEIGHT = 1920
export const GAME_END_DELAY = 3000
export const ITERATION_MODES = {
  TEN_CLICKS: '10clk',
  SIXTY_SECONDS: '60sec',
  FULL_GAME: 'full',
}
export const DEFAULT_ITERATION_MODE = ITERATION_MODES.TEN_CLICKS
export const ITERATION_CONFIGS = {
  [ITERATION_MODES.TEN_CLICKS]: { moveLimit: 10, correctPlacementsRequired: null, timeLimitMs: null },
  [ITERATION_MODES.SIXTY_SECONDS]: { moveLimit: null, correctPlacementsRequired: null, timeLimitMs: 60000 },
  [ITERATION_MODES.FULL_GAME]: { moveLimit: null, correctPlacementsRequired: null, timeLimitMs: null },
}

function normalizeIterationMode(value) {
  if (!value) return null
  return ITERATION_CONFIGS[value] ? value : null
}

export const ITERATION_MODE = normalizeIterationMode(globalThis.__ITERATION_MODE__)
  || DEFAULT_ITERATION_MODE
export const TRAY_ITEM_HEIGHT = 350
export const TRAY_HEIGHT = 389
export const TRAY_CENTER_Y = HEIGHT - 195
export const TRAY_TOP_Y = TRAY_CENTER_Y - TRAY_HEIGHT / 2
export const GAME_BOTTOM_BACKGROUND_COLOR = 0x67a5e6
export const GAME_BOTTOM_BACKGROUND_CSS = '#67a5e6'
export const ROOM_LINE_Y = 640
export const ROOM_LINE_CSS = '#666666'
export const ROOM_LINE_EXTENSION_OFFSET_PX = 0
export const ROOM_LINE_EXTENSION_Y_OFFSET_PX = ROOM_LINE_EXTENSION_OFFSET_PX
export const ROOM_LINE_EXTENSION_THICKNESS_PX = 4
export const ROOM_LINE_EXTENSION_LEFT_OVERLAP_PX = 2
export const ROOM_LINE_EXTENSION_RIGHT_OVERLAP_PX = 2
export const ROOM_LINE_COVER_ENABLED = true
export const ROOM_LINE_COVER_COLOR = 0x000000
export const ROOM_LINE_COVER_Y = ROOM_LINE_Y
export const ROOM_LINE_COVER_HEIGHT = 5
export const ROOM_LINE_COVER_DEPTH = 0.05
export const ROOM_LINE_COVER_SEGMENTS = [
  { x: 0, width: WIDTH },
]
export const ROOM_LINE_COUCH_MASK_COLOR = 0xffffff
export const ROOM_LINE_COUCH_MASK_Y = ROOM_LINE_Y
export const ROOM_LINE_COUCH_MASK_CENTER_X = (WIDTH - 5) / 2
export const ROOM_LINE_COUCH_MASK_WIDTH = 505
export const ROOM_LINE_COUCH_MASK_HEIGHT = 7
export const ROOM_LINE_COUCH_MASK_DEPTH = ROOM_LINE_COVER_DEPTH + 0.01
export const ROOM_LINE_COUCH_MASK_SEGMENTS = [
  { x: ROOM_LINE_COUCH_MASK_CENTER_X - ROOM_LINE_COUCH_MASK_WIDTH / 2, width: ROOM_LINE_COUCH_MASK_WIDTH },
]
export const TRAY_BADGE_OFFSET_X = 102
export const TRAY_BADGE_OFFSET_Y = -150
export const TRAY_BADGE_LOCAL_OFFSET_Y = -80
export const TRAY_TOUCH_PADDING = 56
export const TUTORIAL_OVERLAY_ALPHA = 0.75
export const INACTIVITY_HINT_DELAY = 5000
export const RANDOMIZE_STICKER_ORDER = true
export const SHOW_ALL_NUMBERED_ITEMS_FOR_LAYOUT = false
export const TRAY_BACKGROUND_DEPTH = 4500
export const TRAY_ITEM_DEPTH = 5000
export const ACTIVE_DRAG_DEPTH = 10000
export const BURST_DEPTH = 20000
export const SKIP_TO_ENDCARD = false

export const IOS_STORE_URL = 'https://apps.apple.com/us/app/sticker-book-color-by-number/id6450409974'
export const ANDROID_STORE_URL = 'https://play.google.com/store/apps/details?id=com.game5mobile.sticker&hl=en'

export const STICKERS = [
  { id: 10, x: 157, y: 946, trayMax: 250 },
  { id: 14, x: 550, y: 1042, trayMax: 340 },
  { id: 7, x: 878, y: 805, trayMax: 255 },
  { id: 47, x: 540, y: 515, trayMax: 210 },
  { id: 18, x: 710, y: 486, trayMax: 210 },
  { id: 11, x: 370, y: 485, trayMax: 235 },
  { id: 1, x: 420, y: 920, trayMax: 215 },
  { id: 6, x: 878, y: 98, trayMax: 160 },
  { id: 26, x: 170, y: 460, trayMax: 235 },
  { id: 17, x: 436, y: 86 },
  { id: 42, x: 630, y: 86 },
  { id: 12, x: 784, y: 86 },
  { id: 34, x: 948, y: 92 },
  { id: 5, x: 441, y: 278 },
  { id: 30, x: 598, y: 282 },
  { id: 23, x: 744, y: 286 },
  { id: 45, x: 890, y: 315 },
  { id: 50, x: 405, y: 450 },
  { id: 27, x: 930, y: 515 },
  { id: 33, x: 55, y: 588 },
  { id: 22, x: 90, y: 670 },
  { id: 29, x: 300, y: 679 },
  { id: 16, x: 395, y: 669 },
  { id: 41, x: 520, y: 735 },
  { id: 35, x: 710, y: 690 },
  { id: 43, x: 818, y: 708 },
  { id: 13, x: 922, y: 705 },
  { id: 38, x: 995, y: 655 },
  { id: 4, x: 148, y: 842 },
  { id: 37, x: 340, y: 835 },
  { id: 24, x: 590, y: 855 },
  { id: 46, x: 762, y: 844 },
  { id: 44, x: 260, y: 944 },
  { id: 19, x: 730, y: 941 },
  { id: 31, x: 810, y: 940 },
  { id: 48, x: 990, y: 945 },
  { id: 15, x: 93, y: 1017 },
  { id: 21, x: 205, y: 1100 },
  { id: 49, x: 510, y: 1020 },
  { id: 28, x: 590, y: 990 },
  { id: 32, x: 380, y: 1100 },
  { id: 8, x: 550, y: 1164 },
  { id: 2, x: 702, y: 1166 },
  { id: 25, x: 880, y: 1142 },
  { id: 40, x: 132, y: 1300 },
  { id: 3, x: 282, y: 1317 },
  { id: 36, x: 480, y: 1350 },
  { id: 20, x: 669, y: 1390 },
  { id: 39, x: 855, y: 1390 },
  { id: 9, x: 975, y: 1320 },
]

export const STICKER_LAYOUT = {
  1: { z: 1113, labelX: -30, labelY: 0 },
  2: { z: 1166, labelX: 20, labelY: 0 },
  3: { z: 1317, labelX: 0, labelY: 0 },
  4: { z: 947, labelX: 0, labelY: 0 },
  5: { z: 278, labelX: 0, labelY: 0 },
  6: { z: 142, labelX: 0, labelY: 35 },
  7: { z: 805, labelX: 0, labelY: -35 },
  8: { z: 1184, labelX: 0, labelY: -25 },
  9: { z: 1320, labelX: 0, labelY: 0 },
  10: { z: 946, labelX: 0, labelY: 0 },
  11: { z: 485, labelX: 0, labelY: 0 },
  12: { z: 140, labelX: 0, labelY: 35 },
  13: { z: 805, labelX: 0, labelY: 0 },
  14: { z: 1112, labelX: 140, labelY: 40 },
  15: { z: 1017, labelX: 0, labelY: 0 },
  16: { z: 669, labelX: 0, labelY: 0 },
  17: { z: 86, labelX: 0, labelY: 0 },
  18: { z: 486, labelX: 0, labelY: 0 },
  19: { z: 1113, labelX: -45, labelY: -30 },
  20: { z: 1390, labelX: 0, labelY: 0 },
  21: { z: 1112, labelX: 10, labelY: -10 },
  22: { z: 670, labelX: 0, labelY: 0 },
  23: { z: 286, labelX: 0, labelY: 0 },
  24: { z: 855, labelX: 0, labelY: -20 },
  25: { z: 1142, labelX: 0, labelY: 0 },
  26: { z: 440, labelX: -20, labelY: -75 },
  27: { z: 515, labelX: 0, labelY: 0 },
  28: { z: 1114, labelX: 0, labelY: 0 },
  29: { z: 668, labelX: -75, labelY: 0 },
  30: { z: 282, labelX: 0, labelY: 0 },
  31: { z: 1113, labelX: 35, labelY: 0 },
  32: { z: 1160, labelX: 0, labelY: 0 },
  33: { z: 568, labelX: 0, labelY: -30 },
  34: { z: 140, labelX: -5, labelY: 30 },
  35: { z: 690, labelX: 0, labelY: 0 },
  36: { z: 1391, labelX: 0, labelY: 0 },
  37: { z: 835, labelX: 0, labelY: -25 },
  38: { z: 655, labelX: 0, labelY: 0 },
  39: { z: 1390, labelX: -20, labelY: 0 },
  40: { z: 1318, labelX: -40, labelY: 0 },
  41: { z: 735, labelX: 0, labelY: 0 },
  42: { z: 86, labelX: -10, labelY: -10 },
  43: { z: 805, labelX: 0, labelY: 0 },
  44: { z: 1112, labelX: 0, labelY: 0 },
  45: { z: 315, labelX: 0, labelY: 0 },
  46: { z: 844, labelX: -10, labelY: 0 },
  47: { z: 515, labelX: 0, labelY: 0 },
  48: { z: 945, labelX: 0, labelY: 0 },
  49: { z: 1113, labelX: -30, labelY: 30 },
  50: { z: 410, labelX: 75, labelY: -30 },
}

export const ACTIVE_ITERATION = ITERATION_CONFIGS[ITERATION_MODE]
export const STICKERS_TO_PLAY_BEFORE_ENDCARD = ACTIVE_ITERATION.correctPlacementsRequired ?? STICKERS.length

function getStickerPlayOrder() {
  if (!RANDOMIZE_STICKER_ORDER) return STICKERS

  const shuffled = [...STICKERS]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }
  return shuffled
}

export const PLAYABLE_STICKERS = getStickerPlayOrder().slice(
  0,
  Math.min(Math.max(STICKERS_TO_PLAY_BEFORE_ENDCARD, 1), STICKERS.length),
)

export const ROUNDS = Array.from({ length: Math.ceil(PLAYABLE_STICKERS.length / 3) }, (_, index) =>
  PLAYABLE_STICKERS.slice(index * 3, index * 3 + 3).map((sticker) => sticker.id),
)

export function getStickerLayout(sticker) {
  return STICKER_LAYOUT[sticker.id] || { z: sticker.y, labelX: 0, labelY: 0 }
}
