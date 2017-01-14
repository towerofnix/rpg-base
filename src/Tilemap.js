class Tilemap {
  constructor(levelmap) {
    this.levelmap = levelmap

    this.tiles = []
    this.clearTiles()
  }

  clearTiles() {
    this.tiles.splice(0, this.tiles.length)
  }

  drawTo(canvasTarget) {
    const {
      tileSize, scrollX, scrollY, width, height, tileAtlas
    } = this.levelmap

    const { width: canvasWidth, height: canvasHeight } = canvasTarget

    // We don't want to render tiles that aren't in our tilemap, so we apply
    // these constraints to each start/end parse position.
    const constrainX = x => Math.max(0, Math.min(width, x))
    const constrainY = y => Math.max(0, Math.min(height, y))

    const startParseX = constrainX(Math.floor(scrollX))
    const startParseY = constrainY(Math.floor(scrollY))

    const endParseX = constrainX(Math.ceil(scrollX + canvasWidth / tileSize))
    const endParseY = constrainY(Math.ceil(scrollY + canvasHeight / tileSize))

    const ctx = canvasTarget.getContext('2d')

    for (let x = startParseX; x < endParseX; x++) {
      for (let y = startParseY; y < endParseY; y++) {
        const id = this.getTileAt(x, y)

        ctx.drawImage(
          tileAtlas.image,

          ...tileAtlas.getTexturePos(id),

          tileAtlas.textureSize, tileAtlas.textureSize,

          Math.floor((x - scrollX) * tileSize),
          Math.floor((y - scrollY) * tileSize),

          tileSize, tileSize
        )
      }
    }
  }

  getTileAt(tileX, tileY) {
    // Gets the tile at the given tileX and tileY position. The increment
    // between each number should be 1, not tileSize (that means [0, 1, 2, 3],
    // not [0, 16, 32, 48]).

    const i = joinPosToIndex([tileX, tileY], this.levelmap.width, 1)

    return this.tiles[i]
  }
}
