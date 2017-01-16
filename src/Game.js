const Levelmap = require('./Levelmap')
const KeyListener = require('./KeyListener')

module.exports = class Game {
  constructor(canvasTarget) {
    this.canvasTarget = canvasTarget
    this.canvasTarget.setAttribute('tabindex', 1)
    this.canvasTarget.focus()

    this.levelmap = new Levelmap(this)

    this.keyListener = new KeyListener(canvasTarget)
  }

  tick() {
    this.levelmap.tick()

    this.keyListener.clearJustPressed()
  }

  draw() {
    this.levelmap.drawTo(this.canvasTarget)
  }
}
