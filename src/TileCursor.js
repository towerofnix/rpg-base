const EventEmitter = require('events')

const { blink } = require('./draw-util')

module.exports = class TileCursor extends EventEmitter {
  constructor(tileSize, keyListener) {
    super()

    this.x = 0
    this.y = 0

    this.tileSize = tileSize
    this.keyListener = keyListener

    this.moveDelayTicks = 0
  }

  drawNew() {
    // Draws a totally new tile cursor onto a new canvas. Probably not very
    // efficient, since it has to create a new <canvas> element every time it's
    // called..

    const { tileSize } = this

    const canvas = document.createElement('canvas')
    canvas.width = tileSize
    canvas.height = tileSize

    const ctx = canvas.getContext('2d')

    ctx.fillStyle = `rgba(255, 255, 255, ${blink()})`

    ctx.beginPath()
    ctx.rect(0, 0, tileSize, tileSize)

    // This is a "counter-clockwise" rectangle, it cuts out of the cursor
    // rectangle.
    ctx.rect(
      tileSize - 2, 2,
      -tileSize + 4, tileSize - 4
    )

    ctx.fill()

    return canvas
  }

  tick() {
    const { keyListener } = this

    // If we press an arrow key and hold SHIFT, we should move at 10x speed.
    // Otherwise just move one tile. Also, if we're moving quickly, the delay
    // between each jump should be longer.
    const amount = keyListener.isPressed(16) ? 10 : 1
    const delay = keyListener.isPressed(16) ? 10 : 6

    // If we press an arrow key and hold ALT (option), we should move the
    // view along with the cursor. Otherwise just move the cursor.
    const moveFn = (
      keyListener.isPressed(18)
      ? (x, y) => this.moveViewAndCursor(x, y)
      : (x, y) => this.moveCursor(x, y)
    )

    // Actually handle moving. This only runs when we push down an arrow key.
    // (That is, you have to release the arrow keys before moving another
    // tile.)
    if (this.moveDelayTicks === 0) {
      if (keyListener.isPressed(39)) {
        moveFn(+amount, 0)
        this.moveDelayTicks = delay
      } else if (keyListener.isPressed(38)) {
        moveFn(0, -amount)
        this.moveDelayTicks = delay
      } else if (keyListener.isPressed(37)) {
        moveFn(-amount, 0)
        this.moveDelayTicks = delay
      } else if (keyListener.isPressed(40)) {
        moveFn(0, +amount)
        this.moveDelayTicks = delay
      } else {
        this.moveDelayTicks = 0
      }
    } else {
      this.moveDelayTicks--
    }
  }

  moveViewAndCursor(x, y) {
    this.emit('viewmoved', {by: [x, y]})
    this.moveCursor(x, y)
  }

  moveCursor(x, y) {
    this.x += x
    this.y += y
    this.emit('cursormoved', {by: [x, y], to: [this.x, this.y]})
  }
}
