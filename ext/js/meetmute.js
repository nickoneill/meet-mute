const MUTE_BUTTON = '[role="button"][aria-label][data-is-muted]'
const RAISE_HAND_BUTTON = '[role="button"][aria-label][aria-pressed]'
const REACTION_BUTTON = '[role="button"][aria-label="Send a reaction"]'
const THUMBS_UP_BUTTON = '[role="button"][aria-label="👍"]'
const CELEBRATE_BUTTON = '[role="button"][aria-label="🎉"]'
const HMM_BUTTON = '[role="button"][aria-label="🤔"]'
const HEART_BUTTON = '[role="button"][aria-label="💖"]'
const BROWSER = chrome || browser; // polyfill

const audio_on = new Audio(chrome.runtime.getURL('../sounds/on.mp3'));
const audio_off = new Audio(chrome.runtime.getURL('../sounds/off.mp3'));
let has_audio = false

audio_on.volume = 0.5;
audio_off.volume = 0.5;

BROWSER.storage.sync.get('sound', ({ sound }) => {
  has_audio = Boolean(sound);
});

const waitUntilElementExists = (DOMSelector, MAX_TIME = 5000) => {
  let timeout = 0

  const waitForContainerElement = (resolve, reject) => {
    const container = document.querySelector(DOMSelector)
    timeout += 100

    if (timeout >= MAX_TIME) reject('Element not found')

    if (!container || container.length === 0) {
      setTimeout(waitForContainerElement.bind(this, resolve, reject), 100)
    } else {
      resolve(container)
    }
  }

  return new Promise((resolve, reject) => {
    waitForContainerElement(resolve, reject);
  })
}

var waitingForMuteButton = false

// this waits for the mic button to exist and we assume camera appears at the same time
function waitForMuteButton() {
  if (waitingForMuteButton) {
    return
  }
  waitingForMuteButton = true
  waitUntilElementExists(MUTE_BUTTON)
    .then((el) => {
      waitingForMuteButton = false
      updateMuted()
      watchIsMuted(el)
    })
    .catch((error) => {
      console.log("error: "+error)
      chrome.runtime.sendMessage({ message: 'disconnected' })
    })
}

var waitingForReactionPanel = false

// waits until the reaction panel is open
function waitForReactions(fn) {
  if (waitingForReactionPanel) {
    return
  } 

  waitingForReactionPanel = true
  waitUntilElementExists(THUMBS_UP_BUTTON)
    .then((el) => {
      waitingForReactionPanel = false
      fn()
    })
    .catch((error) => {
      chrome.runtime.sendMessage({ message: 'disconnected' })
    })
}

var muted = false
var camMuted = false
var handRaised = false

function isMuted(index) {
  if (index == null) { index = 0; }
  let muteButtons = document.querySelectorAll(MUTE_BUTTON)
  if (muteButtons.length < 2) {
    console.error("button check didn't find two buttons");
  }
  let dataIsMuted = muteButtons[index]
      .getAttribute('data-is-muted')
  return dataIsMuted == 'true'
}

function isHandRaised() {
  let handIsRaised = document.querySelectorAll(RAISE_HAND_BUTTON)[2]
      .getAttribute('aria-pressed')
  return handIsRaised == 'true'
}

function updateMuted(newValue, index) {
  muted = newValue || isMuted(index)
  chrome.runtime.sendMessage({ message: muted ? 'muted' : 'unmuted' })
}

var isMutedObserver

function watchIsMuted(el) {
  if (isMutedObserver) {
    isMutedObserver.disconnect()
  }
  isMutedObserver = new MutationObserver((mutations) => {
    let newValue = mutations[0].target.getAttribute('data-is-muted') == 'true'

    if (newValue != muted) {
      updateMuted(newValue)
    }
  })
  isMutedObserver.observe(el, {
    attributes: true,
    attributeFilter: ['data-is-muted']
  })
}

function watchBodyClass() {
  const bodyClassObserver = new MutationObserver((mutations) => {
    let newClass = mutations[0].target.getAttribute('class')
    if (mutations[0].oldValue != newClass) {
      waitForMuteButton()
    }
  })
  bodyClassObserver.observe(document.querySelector('body'), {
    attributes: true,
    attributeFilter: ['class'],
    attributeOldValue: true
  })
}

watchBodyClass()

window.onbeforeunload = (event) => {
  chrome.runtime.sendMessage({ message: 'disconnected' })
}

chrome.runtime.onMessage.addListener(
  (request, sender, sendResponse) => {

    if (request && request.command && request.command === 'toggle_mute') {
      muted = isMuted()
      muted = !muted
      sendKeyboardCommand(keydownEvent)
    } else if (request && request.command && request.command === 'mute') {
      muted = isMuted()
      if (!muted) {
        muted = !muted
        sendKeyboardCommand(keydownEvent)
      }
    } else if (request && request.command && request.command === 'unmute') {
      muted = isMuted()
      if (muted) {
        muted = !muted
        sendKeyboardCommand(keydownEvent)
      }
    } else if (request && request.command && request.command === 'toggle_cam') {
      camMuted = isMuted(1)
      camMuted = !camMuted
      sendKeyboardCommand(keydownEventCam)
    } else if (request && request.command && request.command === 'toggle_hand') {
      handRaised = isHandRaised()
      handRaised = !handRaised
      sendKeyboardCommand(keydownEventHand)
    } else if (request && request.command && request.command === 'send_thumbsup') {
      if (document.querySelector(THUMBS_UP_BUTTON) !== null) {
        document.querySelector(THUMBS_UP_BUTTON).click();
      } else {
        document.querySelector(REACTION_BUTTON).click();
        waitForReactions(() => {
          document.querySelector(THUMBS_UP_BUTTON).click();
          document.querySelector(REACTION_BUTTON).click();
        })
      }
    } else if (request && request.command && request.command === 'send_celebrate') {
      if (document.querySelector(CELEBRATE_BUTTON) !== null) {
        document.querySelector(CELEBRATE_BUTTON).click();
      } else {
        document.querySelector(REACTION_BUTTON).click();
        waitForReactions(() => {
          document.querySelector(CELEBRATE_BUTTON).click();
          document.querySelector(REACTION_BUTTON).click();
        })
      }
    } else if (request && request.command && request.command === 'send_hmm') {
      if (document.querySelector(HMM_BUTTON) !== null) {
        document.querySelector(HMM_BUTTON).click();
      } else {
        document.querySelector(REACTION_BUTTON).click();
        waitForReactions(() => {
          document.querySelector(HMM_BUTTON).click();
          document.querySelector(REACTION_BUTTON).click();
        })
      }
    } else if (request && request.command && request.command === 'send_heart') {
      if (document.querySelector(HEART_BUTTON) !== null) {
        document.querySelector(HEART_BUTTON).click();
      } else {
        document.querySelector(REACTION_BUTTON).click();
        waitForReactions(() => {
          document.querySelector(HEART_BUTTON).click();
          document.querySelector(REACTION_BUTTON).click();
        })
      }
    }

    if (has_audio) {
      if (muted) {
        audio_off.currentTime = 0;
        audio_off.play();
      } else {
        audio_on.currentTime = 0;
        audio_on.play();
      }
    }

    sendResponse({ message: muted ? 'muted' : 'unmuted' });
  })

const keydownEvent = new KeyboardEvent('keydown', {
  "key": "d",
  "code": "KeyD",
  "metaKey": true,
  "charCode": 100,
  "keyCode": 100,
  "which": 100
})

const keydownEventCam = new KeyboardEvent('keydown', {
  "key": "e",
  "code": "KeyE",
  "metaKey": true,
  "charCode": 101,
  "keyCode": 101,
  "which": 101
})

const keydownEventHand = new KeyboardEvent('keydown', {
  "key": "h",
  "code": "KeyH",
  "ctrlKey": true,
  "metaKey": true,
  "charCode": 72,
  "keyCode": 72,
  "which": 72
})

function sendKeyboardCommand(event) {
  document.dispatchEvent(event)
}
