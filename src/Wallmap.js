const BaseItemMap = require('./BaseItemMap')

const { joinPosToIndex } = require('./util')
const { blink } = require('./draw-util')

module.exports = class Wallmap extends BaseItemMap {
  // Stores the walls (tile solidity) of a level.

  // Items:
  // Like a tilemap's tiles, except instead of tile IDs we use binary bitsets
  // (technically numbers, whatever..) of four bits, each representing a wall
  // (T, R, B, L). For example a wall that blocks people from going through it
  // on all sides would be 0b1111; a wall that blocks people from going through
  // its right and bottom sides would be 0b0110.

  getAllowedMovement(tileX, tileY) {
    // If an entity is trying to go right, and the tile to the right of it has
    // a solid left wall, it cannot go right.
    //
    // However, if the tile to the right of it does not have a solid left wall,
    // the entity can go to that tile, EVEN IF the tile it's on right now has
    // a solid right tile.

    return {
      right: !((this.getItemAt(tileX + 1, tileY) & 0b0001) >> 0),
      up:    !((this.getItemAt(tileX, tileY - 1) & 0b0010) >> 1),
      left:  !((this.getItemAt(tileX - 1, tileY) & 0b0100) >> 2),
      down:  !((this.getItemAt(tileX, tileY + 1) & 0b1000) >> 3)
    }
  }

  drawItemTo(canvasTarget, wallX, wallY, wall, rendX, rendY) {
    const { tileSize } = this.levelmap

    const ctx = canvasTarget.getContext('2d')
    ctx.beginPath()

    ctx.rect(rendX, rendY, tileSize, tileSize)

    const top =    (wall & 0b1000) >> 3 ? 4 : 0
    const right =  (wall & 0b0100) >> 2 ? 4 : 0
    const bottom = (wall & 0b0010) >> 1 ? 4 : 0
    const left =   (wall & 0b0001) >> 0 ? 4 : 0

    ctx.rect(
      rendX + tileSize - right,
      rendY + top,
      -(tileSize - (left + right)),
      tileSize - (top + bottom)
    )

    ctx.fillStyle = `rgba(255, 255, 255, ${blink()})`
    ctx.fill()
  }
}
