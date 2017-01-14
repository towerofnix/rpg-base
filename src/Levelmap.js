class Levelmap {
  constructor(game, width, height, atlas, tileSize = 16) {
    this.game = game
    this.width = width
    this.height = height
    this.tileAtlas = atlas
    this.tileSize = tileSize

    this.editMode = false

    this.scrollX = 0
    this.scrollY = 0

    this.cursorTileX = 0
    this.cursorTileY = 0
    this.moveTileCursorDelayTicks = 6

    this.tilemap = new Tilemap(this)
    this.wallmap = new Wallmap(this)
    this.entitymap = new Entitymap(this)
  }

  drawTo(canvasTarget) {
    this.tilemap.drawTo(canvasTarget)
    this.entitymap.drawTo(canvasTarget)
    this.wallmap.drawTo(canvasTarget)

    if (this.editMode) {
      this.drawTileCursorTo(canvasTarget)
    }
  }

  drawTileCursorTo(canvasTarget) {
    const tileX = Math.floor((this.cursorTileX - this.scrollX) * this.tileSize)
    const tileY = Math.floor((this.cursorTileY - this.scrollY) * this.tileSize)

    const ctx = canvasTarget.getContext('2d')

    const blink = 0.75 + 0.25 * Math.sin(Date.now() / 200)
    ctx.fillStyle = `rgba(255, 255, 255, ${blink})`

    ctx.beginPath()
    ctx.rect(tileX, tileY, this.tileSize, this.tileSize)

    // This is a "counter-clockwise" rectangle, it cuts out of the cursor
    // rectangle.
    ctx.rect(
      tileX + this.tileSize - 2, tileY + 2,
      -this.tileSize + 4, this.tileSize - 4)

    ctx.fill()
  }

  tick() {
    if (this.editMode) {
      this.editModeTick()
    } else {
      this.entitymap.tick()
    }
  }

  editModeTick() {
    const { keyListener } = this.game

    // Handle editor movement through keyboard input --------------------------

    // If we press an arrow key and hold SHIFT, we should move at 10x speed.
    // Otherwise just move one tile. Also, if we're moving quickly, the delay
    // between each jump should be longer.
    const amount = keyListener.isPressed(16) ? 10 : 1
    const delay = keyListener.isPressed(16) ? 10 : 6

    // If we press an arrow key and hold ALT (option), we should move the view
    // along with the cursor. Otherwise just move the cursor.
    const moveFn = (
      keyListener.isPressed(18)
      ? (x, y) => this.moveViewAndCursor(x, y)
      : (x, y) => this.moveCursor(x, y)
    )

    // Actually handle moving. This only runs when we push down an arrow key.
    // (That is, you have to release the arrow keys before moving another
    // tile.)
    if (this.moveTileCursorDelayTicks === 0) {
      if (keyListener.isPressed(39)) {
        if (!this.didMoveTileCursor) moveFn(+amount, 0)
        this.moveTileCursorDelayTicks = delay
      } else if (keyListener.isPressed(38)) {
        if (!this.didMoveTileCursor) moveFn(0, -amount)
        this.moveTileCursorDelayTicks = delay
      } else if (keyListener.isPressed(37)) {
        if (!this.didMoveTileCursor) moveFn(-amount, 0)
        this.moveTileCursorDelayTicks = delay
      } else if (keyListener.isPressed(40)) {
        if (!this.didMoveTileCursor) moveFn(0, +amount)
        this.moveTileCursorDelayTicks = delay
      } else {
        this.moveTileCursorDelayTicks = 0
      }
    } else {
      this.moveTileCursorDelayTicks--
    }

    const canvasWidth = Math.floor(
      this.game.canvasTarget.width / this.tileSize)

    const canvasHeight = Math.floor(
      this.game.canvasTarget.height / this.tileSize)

    if (this.cursorTileX - this.scrollX >= canvasWidth) {
      this.scrollX = this.cursorTileX - canvasWidth + 1
    }

    if (this.cursorTileX - this.scrollX <= 0) {
      this.scrollX = this.cursorTileX
    }

    if (this.cursorTileY - this.scrollY >= canvasHeight) {
      this.scrollY = this.cursorTileY - canvasHeight + 1
    }

    if (this.cursorTileY - this.scrollY <= 0) {
      this.scrollY = this.cursorTileY
    }
  }

  moveCursor(x, y) {
    this.cursorTileX += x
    this.cursorTileY += y
  }

  moveViewAndCursor(x, y) {
    this.cursorTileX += x
    this.cursorTileY += y
    this.scrollX += x
    this.scrollY += y
  }
}
