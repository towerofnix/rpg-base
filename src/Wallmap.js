const { joinPosToIndex } = require('./util')
const { blink } = require('./draw-util')

module.exports = class Wallmap {
  // Stores the walls (tile solidity) of a level.

  constructor(levelmap) {
    this.levelmap = levelmap

    // Like a tilemap's tiles, except instead of tile IDs we use binary
    // bitsets (technically numbers, whatever..) of four bits, each
    // representing a wall (T, R, B, L). For example a wall that blocks people
    // from going through it on all sides would be 0b1111; a wall that blocks
    // people from going through its right and bottom sides would be 0b0110.
    this.walls = []
  }

  getWallAt(tileX, tileY) {
    // Gets the wall at the given X and Y position. Basically the same as
    // Tilemap's getTileAt.

    const i = joinPosToIndex([tileX, tileY], this.levelmap.width, 1)

    return this.walls[i]
  }

  setWallAt(tileX, tileY, wall) {
    // Sets a wall at the given X and Y position. Basically the same as
    // Tilemap's setTileAt.

    const i = joinPosToIndex([tileX, tileY], this.levelmap.width, 1)

    this.walls[i] = wall
  }

  getAllowedMovement(tileX, tileY) {
    // If an entity is trying to go right, and the tile to the right of it has
    // a solid left wall, it cannot go right.
    //
    // However, if the tile to the right of it does not have a solid left wall,
    // the entity can go to that tile, EVEN IF the tile it's on right now has
    // a solid right tile.

    return {
      right: !((this.getWallAt(tileX + 1, tileY) & 0b0001) >> 0),
      up:    !((this.getWallAt(tileX, tileY - 1) & 0b0010) >> 1),
      left:  !((this.getWallAt(tileX - 1, tileY) & 0b0100) >> 2),
      down:  !((this.getWallAt(tileX, tileY + 1) & 0b1000) >> 3)
    }
  }

  drawTo(canvasTarget) {
    // Duplicate code from tilemap.js, should be in separate file (utils?)

    const {
      tileSize, scrollX, scrollY, width, height, tileAtlas
    } = this.levelmap

    const { width: canvasWidth, height: canvasHeight } = canvasTarget

    const constrainX = x => Math.max(0, Math.min(width, x))
    const constrainY = y => Math.max(0, Math.min(height, y))

    const startParseX = constrainX(Math.floor(scrollX))
    const startParseY = constrainY(Math.floor(scrollY))

    const endParseX = constrainX(Math.ceil(scrollX + canvasWidth / tileSize))
    const endParseY = constrainY(Math.ceil(scrollY + canvasHeight / tileSize))

    const ctx = canvasTarget.getContext('2d')

    ctx.fillStyle = `rgba(255, 255, 255, ${blink()})`

    for (let x = startParseX; x < endParseX; x++) {
      for (let y = startParseY; y < endParseY; y++) {
        const wall = this.getWallAt(x, y)

        ctx.beginPath()

        const rx = (x - scrollX) * tileSize
        const ry = (y - scrollY) * tileSize

        ctx.rect(rx, ry, tileSize, tileSize)

        const top =    (wall & 0b1000) >> 3 ? 4 : 0
        const right =  (wall & 0b0100) >> 2 ? 4 : 0
        const bottom = (wall & 0b0010) >> 1 ? 4 : 0
        const left =   (wall & 0b0001) >> 0 ? 4 : 0

        ctx.rect(
          rx + tileSize - right,
          ry + top,
          -(tileSize - (left + right)),
          tileSize - (top + bottom)
        )

        ctx.fill()
      }
    }
  }
}
