const BaseItemMap = require('./BaseItemMap')

module.exports = class Tilemap extends BaseItemMap {
  drawItemTo(canvasTarget, tileX, tileY, id, rendX, rendY) {
    const { tileAtlas, tileSize } = this.levelmap

    const ctx = canvasTarget.getContext('2d')

    ctx.drawImage(
      tileAtlas.image,

      ...tileAtlas.getTexturePos(id),

      tileAtlas.textureSize, tileAtlas.textureSize,

      rendX, rendY,

      tileSize, tileSize
    )
  }
}
