const Menu = require('../Menu')

const Levelmap = require('../Levelmap')
const LayerMenu = require('./LayerMenu')
const WorldResizeMenu = require('./WorldResizeMenu')
const DoorMenu = require('./DoorMenu')

module.exports = class LevelMenu extends Menu {
  constructor(levelmap) {
    super(levelmap.game, [
      {label: 'Edit World..', action: () => {
        levelmap.activeEditDialog = null
        levelmap.editorMode = Levelmap.EDITOR_MODE_WORLD
      }},
      {label: 'Edit Doormap..', action: () => {
        levelmap.activeEditDialog = null
        levelmap.editorMode = Levelmap.EDITOR_MODE_DOORMAP
      }},
      {label: 'Edit Layers..', action: () => this.layerMenu()},
      {label: 'Edit Doors..', action: () => this.doorMenu()},
      {label: 'Resize Map..', action: () => this.resizeMenu()},
    ])

    this.levelmap = levelmap
  }

  resizeMenu() {
    const { levelmap } = this

    const menu = new WorldResizeMenu(this.levelmap)
    this.initSubmenu(menu)
  }

  layerMenu() {
    const menu = new LayerMenu(this.levelmap)
    this.initSubmenu(menu)
  }

  doorMenu() {
    const menu = new DoorMenu(this.levelmap)
    this.initSubmenu(menu)
  }

  initSubmenu(menu) {
    menu.on('confirmed', () => this.levelmap.activeEditDialog = this)
    menu.on('canceled', () => this.levelmap.activeEditDialog = this)
    menu.on('dialogRequested', d => this.levelmap.activeEditDialog = d)
    this.levelmap.activeEditDialog = menu
  }
}
