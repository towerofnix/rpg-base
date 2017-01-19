const EDITOR_MODE_DISABLED = false
const EDITOR_MODE_WORLD = 'WORLD'
const EDITOR_MODE_PICK_WORLD_TILE = 'PICK_WORLD_TILE'
const EDITOR_MODE_DOORMAP = 'DOORMAP'
const EDITOR_MODE_TEST = 'TEST'

const exportConstants = () => {
  // Modules required here won't be able to access these constants unless we
  // export them NOW, but later on modules that require this won't be able to
  // access those properties because we overrided module.exports altogether
  // (to the Levelmap class), so we need to call this again later.

  Object.assign(module.exports, {
    EDITOR_MODE_DISABLED,
    EDITOR_MODE_WORLD,
    EDITOR_MODE_DOORMAP,
    EDITOR_MODE_PICK_WORLD_TILE,
    EDITOR_MODE_TEST
  })
}

exportConstants()

const EventEmitter = require('events')

const Tilemap = require('./Tilemap')
const Wallmap = require('./Wallmap')
const Entitymap = require('./Entitymap')
const Doormap = require('./Doormap')
const AtlasTilePicker = require('./AtlasTilePicker')
const TileCursor = require('./TileCursor')
const InfoDialog = require('./InfoDialog')
const HeroEntity = require('./entities/HeroEntity')
const { makeKeyAction } = require('./util')

const LevelMenu = require('./menus/LevelMenu')

class Levelmap extends EventEmitter {
  constructor(game, width, height, atlas, tileSize = 16) {
    super()

    this.game = game
    this.width = width
    this.height = height
    this.tileAtlas = atlas
    this.tileSize = tileSize

    this.editorMode = EDITOR_MODE_DISABLED

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

        // But if we're in the tile picker, we want to emit an event, not close
        // the edit dialog..
        if (this.editorMode === EDITOR_MODE_PICK_WORLD_TILE) {
          this.emit('tilePicked', null)
          return
        }

        game.setDialog(this.editInfoMenu)
      }),

      makeKeyAction(game.keyListener, [219], () => { // [
        this.setLayerIndex(this.selectedLayerIndex - 1)
      }),

      makeKeyAction(game.keyListener, [221], () => { // ]
        this.setLayerIndex(this.selectedLayerIndex + 1)
      })
    ]

    this.worldEditorKeyActions = [
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
      })
    ]

    // Tile selecting keys, 1-9.
    //
    // The key code for (number n) is (n + 48). Handy!
    //
    // Since JS indexes start at 0 but the hotbar keys start at 1, we also
    // need to subtract one from the key index.
    for (let i = 1; i <= 9; i++) {
      this.worldEditorKeyActions.push(
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

          const closePicker = this.game.setDialog(picker)

          picker.on('selected', id => {
            this.hotbarTiles[i - 1] = id
            closePicker()
          })
        })
      )
    }

    this.editModeKeyActions = [
      makeKeyAction(game.keyListener, [17, 84], () => {
        // ^T toggles test mode.

        if (this.editorMode === EDITOR_MODE_TEST) {
          // Workaround for "definitely in the editor, just no particular
          // editor..".. XXX
          this.editorMode = true
          this.game.setDialog(this.editInfoMenu)
        } else {
          this.editorMode = EDITOR_MODE_TEST
        }
      })
    ]

    this.hotbarTiles = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    this.hotbarSelectedIndex = 0

    this.scrollX = 0
    this.scrollY = 0

    this.tileCursor = new TileCursor(this.tileSize, this.game.keyListener)
    this.tileCursor.on('viewmoved', evt => {
      const [ x, y ] = evt.by

      this.scrollX += x
      this.scrollY += y
    })

    this.editInfoMenu = new LevelMenu(this)
    this.editInfoDialog = new InfoDialog()

    this.editIsPlacingTiles = false

    this.editModeCanvas = document.createElement('canvas')
    this.editModeCanvas.width = game.canvasTarget.width
    this.editModeCanvas.height = game.canvasTarget.height

    // This should be set by Game when a levelmap is loaded from a file.
    this.filePath = null

    this.layers = [this.createLayer()]
    this.doors = []
    this.defaultSpawnPos = [0, 0, 0] // x, y, layer

    this.selectedLayerIndex = 0
  }

  drawTo(canvasTarget) {
    if (this.editorMode && this.editorMode !== EDITOR_MODE_TEST) {
      const ctx = canvasTarget.getContext('2d')

      this.editModeCanvas.width = canvasTarget.width

      if (this.editorMode === EDITOR_MODE_WORLD) {
        this.editModeCanvas.height = canvasTarget.height - this.tileSize
      } else {
        this.editModeCanvas.height = canvasTarget.height
      }

      const ectx = this.editModeCanvas.getContext('2d')

      ectx.clearRect(
        0, 0, this.editModeCanvas.width, this.editModeCanvas.height
      )

      for (let layer of this.visibleEditorLayers) {
        const { tilemap, wallmap, entitymap, doormap } = layer

        let editorCanvas = this.editModeCanvas

        if (
          tilemap === this.selectedLayer.tilemap && this.jitterSelectedLayer
        ) {
          editorCanvas = document.createElement('canvas')
          editorCanvas.width = canvasTarget.width
          editorCanvas.height = canvasTarget.height
        }

        tilemap.drawTo(editorCanvas)

        if (this.editorMode === EDITOR_MODE_WORLD) {
          wallmap.drawTo(editorCanvas)
          entitymap.drawTo(editorCanvas)
        } else if (this.editorMode === EDITOR_MODE_DOORMAP) {
          doormap.drawTo(editorCanvas)
        }

        if (editorCanvas !== this.editModeCanvas) {
          ectx.drawImage(editorCanvas, Math.floor(Date.now() % 2), 0)
        }
      }

      this.drawTileCursorTo(this.editModeCanvas)

      // Info dialog
      const infoDialogCanvas = document.createElement('canvas')
      infoDialogCanvas.width = canvasTarget.width
      infoDialogCanvas.height = 24
      this.editInfoDialog.drawTo(infoDialogCanvas)
      ectx.drawImage(infoDialogCanvas, 0, 0)

      ctx.drawImage(
        this.editModeCanvas,
        0, canvasTarget.height - this.editModeCanvas.height
      )

      if (this.editorMode === EDITOR_MODE_WORLD) {
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
    if (this.editorMode) {
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

    if (this.editorMode === EDITOR_MODE_TEST) {
      this.gameTick()
    } else {
      this.editorTick()
    }

    // Tick edit mode key actions.
    for (let tick of this.editModeKeyActions) tick()
  }

  editorTick() {
    if (this.editorMode === EDITOR_MODE_WORLD) {
      this.worldEditorTick()
    } else if (this.editorMode === EDITOR_MODE_DOORMAP) {
      this.doormapEditorTick()
    } else if (this.editorMode === EDITOR_MODE_PICK_WORLD_TILE) {
      this.tilePickerTick()
    }

    // Tick editor key actions.
    for (let tick of this.editorKeyActions) tick()
  }

  constrainCursorToLevel() {
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
  }

  viewFollowCursor() {
    // The view will follow the tile cursor when the cursor moves out of the
    // view's edges.

    const canvasWidth = Math.floor(
      this.editModeCanvas.width / this.tileSize)

    const canvasHeight = Math.floor(
      this.editModeCanvas.height / this.tileSize)

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
  }

  worldEditorTick() {
    const { keyListener } = this.game

    // Handle editor movement through keyboard input --------------------------

    // Cursor/view movement should completely be disabled if the W key is
    // pressed, which controls wall placement.
    if (!keyListener.isPressed(87)) {
      this.tileCursor.tick()
    }

    this.constrainCursorToLevel()
    this.viewFollowCursor()

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

      this.selectedLayer.tilemap.setItemAt(x, y, selectedID)

      this.editIsPlacingTiles = true
    }

    if (!keyListener.isPressed(32)) {
      this.editIsPlacingTiles = false
    }

    for (let tick of this.worldEditorKeyActions) tick()
  }

  doormapEditorTick() {
    const { keyListener } = this.game

    this.tileCursor.tick()
    this.constrainCursorToLevel()
    this.viewFollowCursor()

    // Door placing -----------------------------------------------------------

    // By rights we should do the same deal with dragging as we do in
    // worldEditorTick, but it's not really necessary, since pressing a number
    // usually won't result in the doormap editor unexpectedly appearing.

    // The 0-9 keys, all equal to n + 48.
    for (let i = 0; i <= 9; i++) {
      if (keyListener.isPressed(i + 48)) {
        const { doormap } = this.selectedLayer

        doormap.setItemAt(this.tileCursor.x, this.tileCursor.y, i)
      }
    }
  }

  tilePickerTick() {
    const { keyListener } = this.game

    this.tileCursor.tick()
    this.constrainCursorToLevel()
    this.viewFollowCursor()

    // Space or enter
    if (keyListener.isJustPressed(32) || keyListener.isJustPressed(13)) {
      const selectedTile = this.selectedLayer.tilemap.getItemAt(
        this.tileCursor.x, this.tileCursor.y
      )

      const evt = {
        x: this.tileCursor.x,
        y: this.tileCursor.y,
        layer: this.selectedLayerIndex,
        tileID: selectedTile
      }

      this.emit('tilePicked', evt)
    }
  }

  wallPressed(wallFlag) {
    // Called when a wall combo key is pressed (W+arrow). Toggles the edge of
    // the wall under the tile cursor.

    const { wallmap } = this.selectedLayer
    
    const wall = wallmap.getItemAt(this.tileCursor.x, this.tileCursor.y)
    const newWall = wall ^ wallFlag

    wallmap.setItemAt(this.tileCursor.x, this.tileCursor.y, newWall)
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

    this.editInfoDialog.timerText(
      `Current layer: ${this.selectedLayerIndex}` +
      (this.selectedLayer.visibleInEditor ? '' : ' (INVIS)')
    )
  }

  resize(newWidth, newHeight) {
    for (let { tilemap, wallmap } of this.layers) {
      const newTiles = []
      const newWalls = []

      for (let y = 0; y < newHeight; y++) {
        for (let x = 0; x < newWidth; x++) {
          if (x < this.width && y < this.height) {
            newTiles.push(tilemap.getItemAt(x, y))
            newWalls.push(wallmap.getItemAt(x, y))
          } else {
            newTiles.push(0x00)
            newWalls.push(0b0000)
          }
        }
      }

      tilemap.items = newTiles
      wallmap.items = newWalls
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

  get visibleEditorLayers() {
    return this.layers.filter(x => x.visibleInEditor)
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
      visibleInEditor: true,

      tilemap: new Tilemap(this),
      wallmap: new Wallmap(this),
      entitymap: new Entitymap(this),
      doormap: new Doormap(this)
    }
  }

  createDoor() {
    return {
      to: null,
      spawnPos: [0, 0, 0]
    }
  }

  getSaveObj() {
    return {
      width: this.width,
      height: this.height,
      layers: this.layers.map(layer => ({
        tiles: layer.tilemap.items.slice(0),
        walls: layer.wallmap.items.slice(0),
        doors: layer.doormap.items.slice(0),
        entities: layer.entitymap.entityData.map(
          // TODO: More than just hero support.. probably need some dictionary
          // of ids -> entities somewhere.
          ([ cls, x, y ]) => ['__HERO__', x, y]
        )
      })),
      doors: this.doors.map(door => ({
        to: door.to,
        spawnPos: door.spawnPos.slice(0)
      })),
      defaultSpawnPos: this.defaultSpawnPos.slice(0)
    }
  }

  loadFromSaveObj(save) {
    const {
      width = 10, height = 10,
      layers = [], doors = [],
      defaultSpawnPos = []
    } = save

    this.width = width
    this.height = height

    this.layers = layers.map(layerObj => {
      const layer = this.createLayer()

      const { tiles = [], walls = [], doors = [], entities = [] } = layerObj

      layer.tilemap.items = tiles.slice(0)
      layer.wallmap.items = walls.slice(0)
      layer.doormap.items = doors.slice(0)
      layer.entitymap.loadEntityData(entities.map(([ clsID, x, y ]) => [
        HeroEntity, x, y
      ]))

      return layer
    })

    this.doors = doors.map((doorObj) => {
      const door = this.createDoor()

      const { to = null, spawnPos = [0, 0] } = (doorObj || {})

      door.to = to
      door.spawnPos = spawnPos

      return door
    })

    const [ dspX = 0, dspY = 0, dspL = 0 ] = defaultSpawnPos
    this.defaultSpawnPos = [dspX, dspY, dspL]

    this.cleanLayers()
  }

  cleanLayers() {
    for (let { tilemap, wallmap, doormap } of this.layers) {
      tilemap.cleanItems()
      wallmap.cleanItems()
      doormap.cleanItems()
    }
  }

  pickTile() {
    return new Promise(res => {
      this.editorMode = EDITOR_MODE_PICK_WORLD_TILE
      this.once('tilePicked', evt => res(evt))
    })
  }
}

module.exports = Levelmap

exportConstants()
