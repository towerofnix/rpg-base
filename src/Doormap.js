const BaseItemMap = require('./BaseItemMap')

module.exports = class Doormap extends BaseItemMap {
  constructor(levelmap) {
    super(levelmap)
  }

  drawItemTo(canvasTarget, doorX, doorY, door, rendX, rendY) {
    if (door > 0) {
      const ctx = canvasTarget.getContext('2d')

      ctx.fillStyle = 'rgba(255, 255, 200, 0.5)'
      ctx.fillRect(
        rendX, rendY,
        this.levelmap.tileSize, this.levelmap.tileSize
      )

      ctx.font = `12px ${this.game.fontFamily}`
      ctx.textAlign = 'center'
      ctx.fillText(
        door,
        rendX + this.levelmap.tileSize / 2,
        rendY + this.levelmap.tileSize / 2 + 6
      )
    }
  }
}
