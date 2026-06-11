import { ANDROID_STORE_URL, IOS_STORE_URL } from './constants.js'

let mraidReadyPromise
let mraidViewable = true
let mraidExposed = true
let hostMuted = false
let boundGame = null

function getMraid() {
  return typeof window.mraid !== 'undefined' ? window.mraid : null
}

function isAndroid() {
  const userAgent = navigator.userAgent || navigator.vendor || ''
  return /android/i.test(userAgent)
}

export function getStoreUrl() {
  return isAndroid() ? ANDROID_STORE_URL : IOS_STORE_URL
}

function safeCall(name, callback) {
  try {
    callback()
    return true
  } catch (error) {
    console.warn(`[Network] ${name} failed`, error)
    return false
  }
}

export function trackEvent(eventName) {
  if (typeof window.ALPlayableAnalytics?.trackEvent === 'function') {
    window.ALPlayableAnalytics.trackEvent(eventName)
    return
  }
  if (typeof window.playableSDK?.reportEvent === 'function') {
    window.playableSDK.reportEvent(eventName)
    return
  }
  console.log('[Analytics]', eventName)
}

export function installLifecycleStubs() {
  const stubNames = ['gameReady', 'gameStart', 'gameEnd', 'gameClose', 'gameRetry']
  stubNames.forEach((name) => {
    if (typeof window[name] !== 'function') {
      window[name] = () => console.log(`[Lifecycle] ${name}`)
    }
  })
}

export function notifyGameReady() {
  safeCall('gameReady', () => window.gameReady?.())
  trackEvent('DISPLAYED')
}

export function notifyGameStart() {
  if (window.__VUNGLE__) {
    window.parent?.postMessage?.('interacted', '*')
  }
  safeCall('gameStart', () => window.gameStart?.())
  trackEvent('CHALLENGE_STARTED')
}

export function notifyGameEnd() {
  if (window.__VUNGLE__) {
    window.parent?.postMessage?.('complete', '*')
  }
  safeCall('gameEnd', () => window.gameEnd?.())
  trackEvent('CHALLENGE_SOLVED')
}

export function notifyEndcardShown() {
  trackEvent('ENDCARD_SHOWN')
}

export function notifyGameClose() {
  safeCall('gameClose', () => window.gameClose?.())
  trackEvent('CTA_CLICKED')
}

function canUseMraidOpen(mraid) {
  if (!mraid || typeof mraid.open !== 'function') return false
  if (typeof mraid.getState === 'function' && mraid.getState() === 'loading') return false
  return true
}

export function triggerCTA() {
  const url = getStoreUrl()
  notifyGameClose()

  if (typeof window.ExitApi?.exit === 'function') {
    window.ExitApi.exit()
    return
  }
  if (typeof window.FbPlayableAd?.onCTAClick === 'function') {
    window.FbPlayableAd.onCTAClick()
    return
  }
  if (typeof window.Luna?.Unity?.Playable?.InstallFullGame === 'function') {
    window.Luna.Unity.Playable.InstallFullGame()
    return
  }
  if (typeof window.playableSDK?.openAppStore === 'function') {
    window.playableSDK.openAppStore()
    return
  }
  if (typeof window.install === 'function') {
    window.install()
    return
  }
  if (typeof window.openAppStore === 'function') {
    window.openAppStore()
    return
  }
  if (typeof window.clickTag === 'string' && window.clickTag) {
    window.open(window.clickTag, '_blank', 'noopener,noreferrer')
    return
  }
  if (window.__VUNGLE__) {
    window.parent?.postMessage?.('download', '*')
    return
  }
  if (window.__TIKTOK__ && typeof window.playableSDK?.openAppStore !== 'function') {
    window.open(url, '_blank', 'noopener,noreferrer')
    return
  }

  const mraid = getMraid()
  if (canUseMraidOpen(mraid)) {
    mraid.open(url)
    return
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}

function applyPauseState() {
  if (!boundGame?.sound) return
  const shouldPause = document.hidden || !mraidViewable || !mraidExposed
  boundGame.sound.mute = shouldPause || hostMuted
  if (shouldPause) {
    boundGame.scene.pause('StickerBookScene')
  } else {
    boundGame.scene.resume('StickerBookScene')
  }
}

function setupMraidListeners(mraid) {
  if (!mraid || mraid.__stickerBookListenersBound) return
  mraid.__stickerBookListenersBound = true

  if (typeof mraid.isViewable === 'function') {
    mraidViewable = Boolean(mraid.isViewable())
  }

  if (typeof mraid.addEventListener === 'function') {
    mraid.addEventListener('error', (message, action) => {
      console.warn('[MRAID error]', { message, action })
    })
    mraid.addEventListener('stateChange', (state) => {
      console.log('[MRAID stateChange]', state)
    })
    mraid.addEventListener('exposureChange', (exposedPercentage) => {
      if (typeof exposedPercentage === 'number') {
        mraidExposed = exposedPercentage > 0
        applyPauseState()
      }
    })
    mraid.addEventListener('viewableChange', (viewable) => {
      mraidViewable = Boolean(viewable)
      applyPauseState()
    })
    mraid.addEventListener('audioVolumeChange', (pct) => {
      if (typeof pct === 'number' && boundGame?.sound) {
        boundGame.sound.volume = pct / 100
      }
    })
  }
}

function waitForMraidInjection(detectTimeoutMs) {
  const started = Date.now()
  return new Promise((resolve) => {
    const poll = () => {
      const mraid = getMraid()
      if (mraid || Date.now() - started >= detectTimeoutMs) {
        resolve(mraid)
        return
      }
      window.setTimeout(poll, 50)
    }
    poll()
  })
}

export async function initMraid(timeoutMs = 2000, detectTimeoutMs = 500) {
  if (mraidReadyPromise) return mraidReadyPromise

  mraidReadyPromise = waitForMraidInjection(detectTimeoutMs).then((mraid) => new Promise((resolve) => {
    if (!mraid) {
      resolve(false)
      return
    }

    const finish = () => {
      setupMraidListeners(mraid)
      resolve(true)
    }

    if (typeof mraid.getState === 'function' && mraid.getState() === 'loading' && typeof mraid.addEventListener === 'function') {
      let done = false
      const ready = () => {
        if (done) return
        done = true
        finish()
      }
      mraid.addEventListener('ready', ready)
      window.setTimeout(ready, timeoutMs)
      return
    }

    finish()
  }))

  return mraidReadyPromise
}

export const mraidReady = initMraid()

export function bindLifecycle(game) {
  boundGame = game
  const onVisibility = () => applyPauseState()
  const pause = () => {
    mraidViewable = false
    applyPauseState()
  }
  const resume = () => {
    mraidViewable = true
    applyPauseState()
  }
  const mute = () => {
    hostMuted = true
    applyPauseState()
  }
  const unmute = () => {
    hostMuted = false
    applyPauseState()
  }
  const onMessage = (event) => {
    if (event.data === 'onPause') pause()
    if (event.data === 'onResume') resume()
  }

  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('ad-event-pause', pause)
  window.addEventListener('ad-event-resume', resume)
  window.addEventListener('luna:pause', pause)
  window.addEventListener('luna:resume', resume)
  window.addEventListener('luna:mute', mute)
  window.addEventListener('luna:unmute', unmute)
  window.addEventListener('message', onMessage)
  game.events.once('destroy', () => {
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('ad-event-pause', pause)
    window.removeEventListener('ad-event-resume', resume)
    window.removeEventListener('luna:pause', pause)
    window.removeEventListener('luna:resume', resume)
    window.removeEventListener('luna:mute', mute)
    window.removeEventListener('luna:unmute', unmute)
    window.removeEventListener('message', onMessage)
    boundGame = null
  })
  applyPauseState()
}
