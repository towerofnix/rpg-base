const Dialog = require('./Dialog')
const TileCursor = require('./TileCursor')
const { makeKeyAction, joinPosToIndex } = require('./util')

module.exports = class AtlasTilePicker extends Dialog {
  constructor(tileAtlas, keyListener) {
    super()

    this.tileAtlas = tileAtlas
    this.tileCursor = new TileCursor(this.tileAtlas.textureSize, keyListener)

    this.keyActions = [
      makeKeyAction(keyListener, [32], () => {
        this.emit('selected', this.selectedIndex)
      })
    ]
  }

  drawTo(canvasTarget) {
    const ctx = canvasTarget.getContext('2d')
    ctx.drawImage(this.tileAtlas.image, 0, 0)

    const s = this.tileAtlas.textureSize

    ctx.drawImage(
      this.tileCursor.drawNew(),
      this.tileCursor.x * s,
      this.tileCursor.y * s
    )
  }

  tick() {
    this.tileCursor.tick()

    const width = this.tileAtlas.image.width / this.tileAtlas.textureSize
    const height = this.tileAtlas.image.height / this.tileAtlas.textureSize

    if (this.tileCursor.x < 0) {
      if (this.tileCursor.y > 0) {
        this.tileCursor.x = width - 1
        this.tileCursor.y -= 1
      } else {
        this.tileCursor.x = 0
      }
    }

    if (this.tileCursor.x >= width) {
      if (this.tileCursor.y < height - 1) {
        this.tileCursor.x = 0
        this.tileCursor.y += 1
      } else {
        this.tileCursor.x = width - 1
      }
    }

    if (this.tileCursor.y >= height) {
      this.tileCursor.y = height - 1
    }

    if (this.tileCursor.y < 0) {
      this.tileCursor.y = 0
    }

    for (let tick of this.keyActions) tick()
  }

  get selectedIndex() {
    return joinPosToIndex(
      [this.tileCursor.x, this.tileCursor.y],
      this.tileAtlas.image.width / this.tileAtlas.textureSize, 1
    )
  }
}
