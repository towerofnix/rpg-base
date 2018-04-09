const Menu = require('../Menu')

const Levelmap = require('../Levelmap')
const LayerMenu = require('./LayerMenu')
const WorldResizeMenu = require('./WorldResizeMenu')
const DoorMenu = require('./DoorMenu')
const ConfirmCloseMenu = require('./ConfirmCloseMenu')
const { confirm } = require('./ConfirmMenu')

module.exports = class LevelMenu extends Menu {
  constructor(levelmap) {
    super(levelmap.game, [
      {label: 'Edit World..', action: () => this.editWorld()},
      {label: 'Edit General Map Data..', action: () => this.generalMenu()},
      {label: 'Edit Layers..', action: () => this.layerMenu()},
      {label: 'Edit Doors..', action: () => this.doorMenu()},
      {label: 'Edit Doormap..', action: () => this.editDoormap()},
      {label: 'Resize Map..', action: () => this.resizeMenu()},
      {label: 'Test', action: () => this.test()},
      {label: 'Save', action: () => this.save()},
      {label: 'Close..', action: () => this.close()}
    ])

    this.levelmap = levelmap
  }

  editWorld() {
    this.game.setDialog(null)
    this.levelmap.editorMode = Levelmap.EDITOR_MODE_WORLD
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

  editDoormap() {
    this.game.setDialog(null)
    this.levelmap.editorMode = Levelmap.EDITOR_MODE_DOORMAP
  }

  generalMenu() {
    // I'm actually hiding the fact that you can't really reference 'this' in
    // a getter method, since then 'this' refers to the object and not the
    // lexical this (i.e. the 'this' in the scope of this comment).
    const { levelmap } = this

    const defaultSpawnPosItem = {
      get label() {
        const sp = levelmap.defaultSpawnPos
        return `${sp[0]}, ${sp[1]} on layer ${sp[2]}`
      },

      action: () => {
        const reopenMenu = this.game.setDialog(null)
        levelmap.pickTile().then(tile => {
          if (tile) {
            levelmap.defaultSpawnPos = [tile.x, tile.y, tile.layer]
          }

          reopenMenu()
        })
      }
    }

    const bgmItem = {
      get label() {
        return levelmap.bgm || '(None set)'
      },

      action: () => {
        const packagePath = this.game.pickFile()

        if (packagePath) {
          this.levelmap.bgm = packagePath
        }
      }
    }

    const menu = new Menu(levelmap.game, [
      {label: 'File path:', selectable: false},
      {label: levelmap.filePath, action: () => {
        this.game.revealPath(levelmap.filePath)
      }, selectable: (process.platform === 'darwin')},
      {label: '', selectable: false},

      {label: 'Default spawn pos:', selectable: false},
      defaultSpawnPosItem,
      {label: '', selectable: false},

      {label: 'Background music:', selectable: false},
      bgmItem,
      {label: '', selectable: false},

      {label: 'Back', action: () => closeMenu()}
    ])

    const closeMenu = this.initSubmenu(menu)
  }

  initSubmenu(menu) {
    // Aliases ftw?
    menu.on('confirmed', () => closeMenu())
    menu.on('canceled', () => closeMenu())
    menu.on('closed', () => closeMenu())
    const closeMenu = this.game.setDialog(menu)
    return closeMenu
  }

  test() {
    this.game.setDialog(null)
    this.game.initializeLevelmap()
    this.levelmap.enableTestMode()
  }

  save() {
    this.game.saveLevelmap()
      .then(() => {
        console.log('Saved.')
      })
      .catch(err => {
        console.error('Failed to save!', err)
      })
  }

  close() {
    const menu = new ConfirmCloseMenu(this.game)

    menu.on('discard-closed', () => {
      this.levelmap.emit('closed', this.levelmap)
    })

    menu.on('save-closed', () => {
      this.game.saveLevelmap().then(() => {
        this.levelmap.emit('closed', this.levelmap)
      })
    })

    menu.on('canceled', () => {
      closeMenu()
    })

    const closeMenu = this.game.setDialog(menu)
  }
}
