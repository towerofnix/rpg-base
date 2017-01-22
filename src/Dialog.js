const EventEmitter = require('events')

// Dialog modes -- these ONLY work when rendered from the game, via setDialog.
// Custom dialogs rendered to another canvas or by another means will behave
// only as its own drawTo method behaves.

// Replace - the dialog rpelaces everything else already drawn in the game's
// draw method. The default draw mode.
const DIALOG_MODE_REPLACE = 'REPLACE'

// Overlay - the dialog gets drawn on top of whatever was already drawn in the
// game's draw method.
const DIALOG_MODE_OVERLAY = 'OVERLAY'

const exportConstants = () => {
  // See Levelmap.js

  Object.assign(module.exports, {
    DIALOG_MODE_REPLACE,
    DIALOG_MODE_OVERLAY
  })
}

module.exports = class Dialog extends EventEmitter {
  constructor() {
    super()

    this.renderMode = DIALOG_MODE_REPLACE
  }

  tick() {
    // Override me!
  }

  drawTo(targetCanvas) {
    // Override me!

    const ctx = targetCanvas.getContext('2d')
    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, targetCanvas.width, targetCanvas.height)
  }

  show() {
    // Override me! Called when set as the active dialog on Game.
    // (See game.setDialog.)
  }
}

exportConstants()
