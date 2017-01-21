const EventEmitter = require('events')

module.exports = class Dialog extends EventEmitter {
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
