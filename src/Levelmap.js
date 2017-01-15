class Levelmap {
  constructor(game, width, height, atlas, tileSize = 16) {
    this.game = game
    this.width = width
    this.height = height
    this.tileAtlas = atlas
    this.tileSize = tileSize

    this.editMode = false
    this.testMode = false

    // In edit mode, the world's view is below a tile picker, so we need to
    // render respective elements to a shorter canvas.
    this.editModeCanvas = document.createElement('canvas')
    this.editModeCanvas.width = game.canvasTarget.width
    this.editModeCanvas.height = game.canvasTarget.height - this.tileSize

    this.hotbarTiles = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    this.hotbarSelectedIndex = 0

    this.scrollX = 0
    this.scrollY = 0

    this.cursorTileX = 0
    this.cursorTileY = 0
    this.moveTileCursorDelayTicks = 6

    this.editWallLastSide = null
    this.didToggleEditMode = false

    this.tilemap = new Tilemap(this)
    this.wallmap = new Wallmap(this)
    this.entitymap = new Entitymap(this)
  }

  drawTo(canvasTarget) {
    if (this.editMode && !this.testMode) {
      const ectx = this.editModeCanvas.getContext('2d')
      ectx.clearRect(
        0, 0, this.editModeCanvas.width, this.editModeCanvas.height
      )

      this.tilemap.drawTo(this.editModeCanvas)
      this.entitymap.drawTo(this.editModeCanvas)
      this.wallmap.drawTo(this.editModeCanvas)
      this.drawTileCursorTo(this.editModeCanvas)

      const ctx = canvasTarget.getContext('2d')
      ctx.drawImage(this.editModeCanvas, 0, this.tileSize)

      this.drawEditHotbarTo(canvasTarget)
    } else {
      this.tilemap.drawTo(canvasTarget)
      this.entitymap.drawTo(canvasTarget)
    }
  }

  drawTileCursorTo(canvasTarget) {
    const tileX = Math.floor((this.cursorTileX - this.scrollX) * this.tileSize)
    const tileY = Math.floor((this.cursorTileY - this.scrollY) * this.tileSize)

    const ctx = canvasTarget.getContext('2d')

    ctx.drawImage(this.drawNewTileCursor(), tileX, tileY)
  }

  drawNewTileCursor() {
    // Draws a totally new tile cursor onto a new canvas. Probably not very
    // efficient, since it has to create a new <canvas> element every time it's
    // called..

    const canvas = document.createElement('canvas')
    canvas.width = this.tileSize
    canvas.height = this.tileSize

    const ctx = canvas.getContext('2d')

    const blink = 0.75 + 0.25 * Math.sin(Date.now() / 200)
    ctx.fillStyle = `rgba(255, 255, 255, ${blink})`

    ctx.beginPath()
    ctx.rect(0, 0, this.tileSize, this.tileSize)

    // This is a "counter-clockwise" rectangle, it cuts out of the cursor
    // rectangle.
    ctx.rect(
      this.tileSize - 2, 2,
      -this.tileSize + 4, this.tileSize - 4
    )

    ctx.fill()

    return canvas
  }

  drawEditHotbarTo(canvasTarget) {
    const ctx = canvasTarget.getContext('2d')

    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, canvasTarget.width, this.tileSize)

    // The hotbar tiles.
    for (let i = 0; i < 9; i++) {
      const hotbarID = this.hotbarTiles[i]

      ctx.drawImage(
        this.tileAtlas.image,

        ...tileAtlas.getTexturePos(hotbarID),
        this.tileAtlas.textureSize, this.tileAtlas.textureSize,

        Math.floor(i * this.tileSize), 0,
        this.tileSize, this.tileSize
      )
    }

    // Draw a tile cursor over the selected tile.
    ctx.drawImage(this.drawNewTileCursor(), this.hotbarSelectedIndex * this.tileSize, 0)

    // Separator bar. It makes it clear that the tile picker isn't part of the
    // world map.
    ctx.fillStyle = 'white'
    ctx.fillRect(0, this.tileSize, canvasTarget.width, 1)
  }

  tick() {
    if (this.editMode) {
      this.editModeTick()
    } else {
      this.gameTick()
    }
  }

  gameTick() {
    this.entitymap.tick()
  }

  editModeTick() {
    const { keyListener } = this.game

    if (this.testMode) {
      this.gameTick()
    } else {
      this.editorTick()
    }

    // Test mode --------------------------------------------------------------

    if (keyListener.isPressed(17) && keyListener.isPressed(84)) { // ^T
      if (!this.didToggleEditMode) {
        this.testMode = !this.testMode
      }

      this.didToggleEditMode = true
    } else {
      this.didToggleEditMode = false
    }
  }

  editorTick() {
    const { keyListener } = this.game

    // Handle editor movement through keyboard input --------------------------

    // Cursor/view movement should completely be disabled if the W key is
    // pressed, which controls wall placement.
    if (!keyListener.isPressed(87)) {

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
      if (this.moveTileCursorDelayTicks === 0) {
        if (keyListener.isPressed(39)) {
          moveFn(+amount, 0)
          this.moveTileCursorDelayTicks = delay
        } else if (keyListener.isPressed(38)) {
          moveFn(0, -amount)
          this.moveTileCursorDelayTicks = delay
        } else if (keyListener.isPressed(37)) {
          moveFn(-amount, 0)
          this.moveTileCursorDelayTicks = delay
        } else if (keyListener.isPressed(40)) {
          moveFn(0, +amount)
          this.moveTileCursorDelayTicks = delay
        } else {
          this.moveTileCursorDelayTicks = 0
        }
      } else {
        this.moveTileCursorDelayTicks--
      }
    }

    // Constrain cursor to level ----------------------------------------------

    // The tile cursor shouldn't be able to move out of the level bounds.

    if (this.cursorTileX > (this.width - 1)) {
      this.cursorTileX = this.width - 1
    }

    if (this.cursorTileX < 0) {
      this.cursorTileX = 0
    }

    if (this.cursorTileY >= (this.height - 1)) {
      this.cursorTileY = this.height - 1
    }

    if (this.cursorTileY < 0) {
      this.cursorTileY = 0
    }

    // Make view follow cursor ------------------------------------------------

    const canvasWidth = Math.floor(
      this.editModeCanvas.width / this.tileSize)

    const canvasHeight = Math.floor(
      this.editModeCanvas.height / this.tileSize)

    // The view will follow the tile cursor when the cursor moves out of the
    // view's edges.

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

    // Tile placing -----------------------------------------------------------

    // Tilemap diffs would be cool but totally unhelpful, lol.

    if (keyListener.isPressed(32)) { // Space
      const selectedID = this.hotbarTiles[this.hotbarSelectedIndex]
      this.tilemap.setTileAt(this.cursorTileX, this.cursorTileY, selectedID)
    }

    // Tile selecting ---------------------------------------------------------

    // The key code for (number n) is (n + 48). Handy!
    //
    // Since JS indexes start at 0 but the hotbar keys start at 1, we also
    // need to subtract one from the key index.

    for (let i = 1; i <= 9; i++) {
      if (keyListener.isPressed(i + 48)) {
        this.hotbarSelectedIndex = i - 1
      }
    }

    // Wall placing -----------------------------------------------------------

    if (keyListener.isPressed(87)) { // W
      let wall = this.wallmap.getWallAt(this.cursorTileX, this.cursorTileY)

      if (keyListener.isPressed(40)) {
        if (this.editWallLastSide !== 'down') wall ^= 0b0010
        this.editWallLastSide = 'down'
      } else if (keyListener.isPressed(39)) {
        if (this.editWallLastSide !== 'right') wall ^= 0b0100
        this.editWallLastSide = 'right'
      } else if (keyListener.isPressed(38)) {
        if (this.editWallLastSide !== 'up') wall ^= 0b1000
        this.editWallLastSide = 'up'
      } else if (keyListener.isPressed(37)) {
        if (this.editWallLastSide !== 'left') wall ^= 0b0001
        this.editWallLastSide = 'left'
      } else {
        this.editWallLastSide = null
      }

      this.wallmap.setWallAt(this.cursorTileX, this.cursorTileY, wall)
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
