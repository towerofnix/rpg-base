const Menu = require('./Menu')
const Tilemap = require('./Tilemap')
const Wallmap = require('./Wallmap')
const Entitymap = require('./Entitymap')
const AtlasTilePicker = require('./AtlasTilePicker')
const { makeKeyAction } = require('./util')
const TileCursor = require('./TileCursor')
const InfoDialog = require('./InfoDialog')

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

    this.editIsPlacingTiles = false

    // If this is enabled, in edit mode, the selected layer will shake so that
    // it's easier to see it's the selected layer.
    this.jitterSelectedLayer = true

    this.editorKeyActions = [
      makeKeyAction(game.keyListener, [17, 74], () => {
        // ^J toggles jitter.

        this.jitterSelectedLayer = !this.jitterSelectedLayer
      }),

      makeKeyAction(game.keyListener, [27], () => {
        // ESC opens the level info/utility menu.

        this.activeEditDialog = this.editInfoMenu
      }),

      makeKeyAction(game.keyListener, [87, 40], () => { // W+Down
        this.wallPressed(0b0010)
      }),

      makeKeyAction(game.keyListener, [87, 39], () => { // W+Right
        this.wallPressed(0b0100)
      }),

      makeKeyAction(game.keyListener, [87, 38], () => { // W+Up
        this.wallPressed(0b1000)
      }),

      makeKeyAction(game.keyListener, [87, 37], () => { // W+Left
        this.wallPressed(0b0001)
      }),

      makeKeyAction(game.keyListener, [219], () => { // [
        this.setLayerIndex(this.selectedLayerIndex - 1)
      }),

      makeKeyAction(game.keyListener, [221], () => { // ]
        this.setLayerIndex(this.selectedLayerIndex + 1)
      })
    ]

    // Tile selecting keys, 1-9.
    //
    // The key code for (number n) is (n + 48). Handy!
    //
    // Since JS indexes start at 0 but the hotbar keys start at 1, we also
    // need to subtract one from the key index.
    for (let i = 1; i <= 9; i++) {
      this.editorKeyActions.push(
        makeKeyAction(game.keyListener, [i + 48], () => {
          this.hotbarSelectedIndex = i - 1
        }),
        makeKeyAction(game.keyListener, [i + 48, 16], () => { // Shift+N
          this.hotbarSelectedIndex = i - 1

          const picker = new AtlasTilePicker(
            this.tileAtlas,
            this.game.keyListener
          )

          const [ x, y ] = this.tileAtlas.getTexturePos(
            this.hotbarTiles[i - 1]
          ).map(n => n / this.tileAtlas.textureSize)

          picker.tileCursor.x = x
          picker.tileCursor.y = y

          picker.on('selected', id => {
            this.activeEditDialog = null
            this.hotbarTiles[i - 1] = id
          })

          this.activeEditDialog = picker
        })
      )
    }

    this.editModeKeyActions = [
      makeKeyAction(game.keyListener, [17, 84], () => {
        // ^T toggles test mode.

        this.testMode = !this.testMode
      })
    ]

    this.hotbarTiles = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    this.hotbarSelectedIndex = 0

    this.scrollX = 0
    this.scrollY = 0

    this.cursorTileX = 0
    this.cursorTileY = 0
    this.tileCursor = new TileCursor(this.tileSize, this.game.keyListener)

    this.editInfoMenu = new Menu(game, [
      {label: 'Resize Map..', action: () => {
        let newWidth = this.width
        let newHeight = this.height

        const updateWidthLabel = () => {
          widthMenuItem.label = 'Width: ' + newWidth
        }

        const widthMenuItem = {
          label: '..', keyAction: key => {
            if (key >= 48 && key <= 57) {
              newWidth = parseInt(
                newWidth.toString().concat(String.fromCharCode(key))
              )
            } else if (key === 8) {
              newWidth = parseInt(newWidth.toString().slice(0, -1))
            }

            if (isNaN(newWidth)) {
              newWidth = 0
            }

            if (newWidth > 1024) {
              newWidth = 1024
            }

            updateWidthLabel()
          }
        }

        const updateHeightLabel = () => {
          heightMenuItem.label = 'Height: ' + newHeight
        }

        const heightMenuItem = {
          label: '..', keyAction: key => {
            if (key >= 48 && key <= 57) {
              newHeight = parseInt(
                newHeight.toString().concat(String.fromCharCode(key))
              )
            } else if (key === 8) {
              newHeight = parseInt(newHeight.toString().slice(0, -1))
            }

            if (isNaN(newHeight)) {
              newHeight = 0
            }

            if (newHeight > 1024) {
              newHeight = 1024
            }

            updateHeightLabel()
          }
        }

        updateWidthLabel()
        updateHeightLabel()

        this.activeEditDialog = new Menu(game, [
          widthMenuItem, heightMenuItem,
          {label: 'Confirm', action: () => {
            this.resize(newWidth, newHeight)
            this.activeEditDialog = this.editInfoMenu
          }},
          {label: 'Cancel', action: () => {
            this.activeEditDialog = this.editInfoMenu
          }}
        ])
      }},
      {label: 'Edit Layers..', action: () => {
        let menu

        const newLayers = this.layers.slice(0)

        const confirmMenuItem = {label: 'Confirm', action: () => {
          // const fn = l => l.tilemap.tiles
          // console.log(this.layers.map(fn))
          // console.log(newLayers.map(fn))

          this.layers = newLayers
          this.activeEditDialog = this.editInfoMenu
        }}

        const cancelMenuItem = {label: 'Cancel', action: () => {
          this.activeEditDialog = this.editInfoMenu
        }}

        const moveDownLayer = (i) => {
          // We can't move the bottom layer down..
          if (i === 0) return

          const layer = newLayers.splice(i, 1)[0]
          newLayers.splice(i - 1, 0, layer)

          const oldIndex = menu.selectedIndex
          setupMenu()
          menu.selectedIndex = oldIndex - 3
        }

        const moveUpLayer = (i) => {
          // We can't move the top layer up..
          if (i === newLayers.length - 1) return

          const layer = newLayers.splice(i, 1)[0]
          newLayers.splice(i + 1, 0, layer)

          const oldIndex = menu.selectedIndex
          setupMenu()
          menu.selectedIndex = oldIndex + 3
        }

        const deleteLayer = (i) => {
          // We can't delete *all* the layers..
          if (newLayers.length === 1) return

          newLayers.splice(i, 1)

          // Since we're pulling everything up we don't need to move the
          // cursor.
          const oldIndex = menu.selectedIndex
          setupMenu()
          menu.selectedIndex = oldIndex
        }

        const addLayerAbove = (i) => {
          newLayers.splice(i - 1, 0, this.createLayer())

          // Since we're pushing everything down we don't need to move the
          // cursor.
          const oldIndex = menu.selectedIndex
          setupMenu()
          menu.selectedIndex = oldIndex
        }

        const createLayerMenuItems = () => {

          const layerMenuItems = []

          for (let i = 0; i < newLayers.length; i++) {
            const layer = newLayers[i]

            layerMenuItems.push({
              label: `Layer ${i} (old: ${this.layers.indexOf(layer)})`,
              action: () => {
                menu.selectedIndex += 1
                menu.constraints()
              },
              keyAction: (key) => {
                // Moving layers use the same keys as going up/down layers in
                // the main level editor.
                if (key === 221) { // ]
                  moveDownLayer(i)
                } else if (key === 219) { // [
                  moveUpLayer(i)
                } else if (key === 189) { // -
                  deleteLayer(i)
                } else if (key === 187) { // +
                  addLayerAbove(i)
                }
              }
            })
            layerMenuItems.push({label: '  Move Down', action: () => {
              moveDownLayer(i)
            }})
            layerMenuItems.push({label: '  Move Up', action: () => {
              moveUpLayer(i)
            }})
          }

          return layerMenuItems
        }

        const setupMenu = () => {
          menu = this.activeEditDialog = new Menu(game, [
            ...createLayerMenuItems(),
            {label: '------------------', selectable: false},
            confirmMenuItem, cancelMenuItem
          ])
        }

        setupMenu()
      }},
      {label: 'Edit Map..', action: () => {
        this.activeEditDialog = null
      }}
    ])

    this.activeEditDialog = this.editInfoMenu
    this.editInfoDialog = new InfoDialog()

    this.layers = []
    this.layers.push(this.createLayer())

    this.selectedLayerIndex = 0
  }

  drawTo(canvasTarget) {
    if (this.editMode && !this.testMode) {
      if (this.activeEditDialog) {
        this.activeEditDialog.drawTo(canvasTarget)
      } else {
        const ctx = canvasTarget.getContext('2d')

        const ectx = this.editModeCanvas.getContext('2d')
        ectx.clearRect(
          0, 0, this.editModeCanvas.width, this.editModeCanvas.height
        )

        for (let { tilemap, wallmap, entitymap } of this.layers) {
          if (
            tilemap === this.selectedLayer.tilemap && this.jitterSelectedLayer
          ) {
            const canvas = document.createElement('canvas')
            canvas.width = canvasTarget.width
            canvas.height = canvasTarget.height
            tilemap.drawTo(canvas)
            wallmap.drawTo(canvas)
            entitymap.drawTo(canvas)
            ectx.drawImage(canvas, Math.floor(Date.now() % 2), 0)
          } else {
            tilemap.drawTo(this.editModeCanvas)
            wallmap.drawTo(this.editModeCanvas)
            entitymap.drawTo(this.editModeCanvas)
          }
        }

        this.drawTileCursorTo(this.editModeCanvas)

        // Info dialog
        const infoDialogCanvas = document.createElement('canvas')
        infoDialogCanvas.width = canvasTarget.width
        infoDialogCanvas.height = 24
        this.editInfoDialog.drawTo(infoDialogCanvas)
        ectx.drawImage(infoDialogCanvas, 0, 0)

        ctx.drawImage(this.editModeCanvas, 0, this.tileSize)

        this.drawEditHotbarTo(canvasTarget)
      }
    } else {
      for (let { tilemap, entitymap } of this.layers) {
        tilemap.drawTo(canvasTarget)
        entitymap.drawTo(canvasTarget)
      }
    }
  }

  drawTileCursorTo(canvasTarget) {
    const tileX = Math.floor(
      (this.tileCursor.x - this.scrollX) * this.tileSize
    )

    const tileY = Math.floor(
      (this.tileCursor.y - this.scrollY) * this.tileSize
    )

    const ctx = canvasTarget.getContext('2d')
    ctx.drawImage(this.tileCursor.drawNew(), tileX, tileY)
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

        ...this.tileAtlas.getTexturePos(hotbarID),
        this.tileAtlas.textureSize, this.tileAtlas.textureSize,

        Math.floor(i * this.tileSize), 0,
        this.tileSize, this.tileSize
      )
    }

    // Draw a tile cursor over the selected tile.
    ctx.drawImage(
      this.tileCursor.drawNew(),
      this.hotbarSelectedIndex * this.tileSize, 0
    )

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
    for (let { entitymap } of this.layers) {
      entitymap.tick()
    }
  }

  editModeTick() {
    const { keyListener } = this.game

    if (this.testMode) {
      this.gameTick()
    } else {
      if (this.activeEditDialog) {
        this.activeEditDialog.tick()

        // A drag from placing tiles should be stopped when the editor isn't
        // "active" anymore.
        this.editIsPlacingTiles = false
      } else {
        this.editorTick()
      }
    }

    // Tick edit mode key actions.
    for (let tick of this.editModeKeyActions) tick()
  }

  editorTick() {
    const { keyListener } = this.game

    // Handle editor movement through keyboard input --------------------------

    // Cursor/view movement should completely be disabled if the W key is
    // pressed, which controls wall placement.
    if (!keyListener.isPressed(87)) {
      this.tileCursor.tick()
    }

    // Constrain cursor to level ----------------------------------------------

    // The tile cursor shouldn't be able to move out of the level bounds.

    if (this.tileCursor.x > (this.width - 1)) {
      this.tileCursor.x = this.width - 1
    }

    if (this.tileCursor.x < 0) {
      this.tileCursor.x = 0
    }

    if (this.tileCursor.y >= (this.height - 1)) {
      this.tileCursor.y = this.height - 1
    }

    if (this.tileCursor.y < 0) {
      this.tileCursor.y = 0
    }

    // Make view follow cursor ------------------------------------------------

    const canvasWidth = Math.floor(
      this.editModeCanvas.width / this.tileSize)

    const canvasHeight = Math.floor(
      this.editModeCanvas.height / this.tileSize)

    // The view will follow the tile cursor when the cursor moves out of the
    // view's edges.

    if (this.tileCursor.x - this.scrollX >= canvasWidth) {
      this.scrollX = this.tileCursor.x - canvasWidth + 1
    }

    if (this.tileCursor.x - this.scrollX <= 0) {
      this.scrollX = this.tileCursor.x
    }

    if (this.tileCursor.y - this.scrollY >= canvasHeight) {
      this.scrollY = this.tileCursor.y - canvasHeight + 1
    }

    if (this.tileCursor.y - this.scrollY <= 0) {
      this.scrollY = this.tileCursor.y
    }

    // Tile placing -----------------------------------------------------------

    // Tilemap diffs would be cool but totally unhelpful, lol.

    // Tile placing is tough, since it uses the same button used to interact
    // with most other UI elements, space, and pressing space can cause the
    // editor to be shown - while space is still pressed. And since the space
    // key was used to show the editor, NOT place a tile, we need to make sure
    // we don't place a tile.
    //
    // Using 'isJustPressed' instead of 'isPressed' works, but that gets rid of
    // our ability to "drag" tiles, which isn't good. So we need to
    // specifically implement dragging for this purpose - we can do that by
    // using a persistent 'editIsPlacingTiles' variable for the sake of
    // deciding whether we're dragging or not. Then we clear that if the editor
    // isn't focused (i.e. there's a dialog open) and it works!
    //
    // (Of course, we also need to clear the 'editIsPlacingTiles' variable if
    // the space key isn't pressed.)

    if (keyListener.isJustPressed(32) || this.editIsPlacingTiles) { // Space
      const selectedID = this.hotbarTiles[this.hotbarSelectedIndex]
      const { x, y } = this.tileCursor

      this.selectedLayer.tilemap.setTileAt(x, y, selectedID)

      this.editIsPlacingTiles = true
    }

    if (!keyListener.isPressed(32)) {
      this.editIsPlacingTiles = false
    }

    // Tick editor key actions.
    for (let tick of this.editorKeyActions) tick()
  }

  wallPressed(wallFlag) {
    // Called when a wall combo key is pressed (W+arrow). Toggles the edge of
    // the wall under the tile cursor.

    // We don't want anything to happen if there's a menu open..
    if (this.activeEditDialog) return

    const { wallmap } = this.selectedLayer
    
    const wall = wallmap.getWallAt(this.tileCursor.x, this.tileCursor.y)
    const newWall = wall ^ wallFlag

    wallmap.setWallAt(this.tileCursor.x, this.tileCursor.y, newWall)
  }

  setLayerIndex(n) {
    // Called when a change layer key is pressed (square brackets). Changes the
    // selected layer index.

    this.selectedLayerIndex = n

    if (this.selectedLayerIndex > this.layers.length - 1) {
      this.selectedLayerIndex = 0
      this.setLayerIndex(n - this.layers.length)
    }

    if (this.selectedLayerIndex < 0) {
      this.selectedLayerIndex = this.layers.length
      this.setLayerIndex(this.layers.length + n)
    }

    this.editInfoDialog.timerText(`Current layer: ${this.selectedLayerIndex}`)
  }

  resize(newWidth, newHeight) {
    for (let { tilemap, wallmap } of this.layers) {
      const newTiles = []
      const newWalls = []

      for (let y = 0; y < newHeight; y++) {
        for (let x = 0; x < newWidth; x++) {
          if (x < this.width && y < this.height) {
            newTiles.push(tilemap.getTileAt(x, y))
            newWalls.push(wallmap.getWallAt(x, y))
          } else {
            newTiles.push(0x00)
            newWalls.push(0b0000)
          }
        }
      }

      tilemap.tiles = newTiles
      wallmap.walls = newWalls
    }

    this.width = newWidth
    this.height = newHeight
  }

  get selectedLayer() {
    // Automagically constrain!
    if (this.selectedLayerIndex > this.layers.length - 1) {
      this.selectedLayerIndex = this.layers.length - 1
    }

    return this.getLayer(this.selectedLayerIndex)
  }

  getLayer(n) {
    if (n >= 0) {
      return this.layers[n]
    } else {
      return this.layers[this.layers.length + n]
    }
  }

  createLayer() {
    return {
      tilemap: new Tilemap(this),
      wallmap: new Wallmap(this),
      entitymap: new Entitymap(this)
    }
  }

  getSaveObj() {
    return {
      width: this.width,
      height: this.height,
      layers: this.layers.map(layer => ({
        tiles: layer.tilemap.tiles.slice(0),
        walls: layer.wallmap.walls.slice(0)
      }))
    }
  }

  loadFromSaveObj(save) {
    this.width = save.width
    this.height = save.height
    this.layers = save.layers.map(layerObj => {
      const layer = this.createLayer()
      layer.tilemap.tiles = layerObj.tiles.slice(0)
      layer.wallmap.walls = layerObj.walls.slice(0)
      return layer
    })
  }
}

module.exports = Levelmap
