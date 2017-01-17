const { joinPosToIndex } = require('./util')

module.exports = class BaseItemMap {
  // A basic scrollable map (like levelmaps and wallmaps and such). For common
  // code.
  //
  // Only implements basic tile drawing; no user interaction. Relies on a
  // parent object (usually a Levelmap) to give it scrollX and scrollY values,
  // as well as the map dimensions (width and height).

  constructor(levelmap) {
    this.levelmap = levelmap
    this.items = new Array(levelmap.width * levelmap.height).fill(0)
  }

  cleanItems(replaceWith = 0) {
    // Replaces all falsey values with a given value (by default, 0).
    // Also adjusts the length of the array so that it's the length it should
    // be (that is, the levelmap's size).

    // Assigning to 'this.items' will mess up the value of 'this.items' WHILE
    // we're setting it, so we need to keep a reference to the old array of
    // items.
    const oldItems = this.items

    this.items = (
      new Array(this.levelmap.width * this.levelmap.height).fill(0).map(
        (x, i) => oldItems[i] || replaceWith
      )
    )
  }

  drawTo(canvasTarget) {
    // Draws items to the target canvas, especially taking care to only render
    // visible ones.
    //
    // Don't override this, override drawItemTo.

    const {
      tileSize, scrollX, scrollY, width, height
    } = this.levelmap

    const { width: canvasWidth, height: canvasHeight } = canvasTarget

    // We don't want to render tiles that aren't in our map, so we apply
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
        const id = this.getItemAt(x, y)

        this.drawItemTo(
          canvasTarget,
          x, y, id,
          Math.floor((x - scrollX) * tileSize),
          Math.floor((y - scrollY) * tileSize)
        )
      }
    }
  }

  drawItemTo(canvasTarget, itemX, itemY, item, rendX, rendY) {
    // Override me!

    // This is just a fancy demo function. Don't bother using this from your
    // override.

    const { tileSize } = this.levelmap

    const ctx = canvasTarget.getContext('2d')

    const shade = Math.floor(
      (255 - 60) + Math.sin(
        ((itemX + itemY) * 5 + Date.now() / 25) / 15
      ) * 60
    )

    const blue = Math.floor(255 - shade / 3)

    ctx.fillStyle = `rgb(${shade}, ${shade}, ${blue})`

    ctx.fillRect(rendX, rendY, tileSize, tileSize)
  }

  getItemAt(itemX, itemY) {
    // Gets the item at the given itemX and itemY position. The increment
    // between each number should be 1, not tileSize (that means [0, 1, 2, 3],
    // not [0, 16, 32, 48]).

    const i = joinPosToIndex([itemX, itemY], this.levelmap.width, 1)

    return this.items[i]
  }

  setItemAt(itemX, itemY, newValue) {
    // Sets an item at the given itemX and itemY position. Like getTileAt,
    // itemX and itemY should be as if the space between each item was 1, not
    // tileSize. ([0, 1, 2, 3], not [0, 16, 32, 48].)

    const i = joinPosToIndex([itemX, itemY], this.levelmap.width, 1)

    this.items[i] = newValue
  }
}
