const { splitIndexToPos } = require('./util')

module.exports = class TileAtlas {
  constructor(image, textureSize = 16) {
    this.image = image
    this.textureSize = textureSize
  }

  getTexturePos(id) {
    return splitIndexToPos(id, this.image.width, this.textureSize)
  }
}
