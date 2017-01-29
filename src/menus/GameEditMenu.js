const Menu = require('../Menu')
const Levelmap = require('../Levelmap')
const Entity = require('../Entity')
const EntityEditMenu = require('./EntityEditMenu')

const fsp = require('fs-promise')
const path = require('path')

module.exports = class GameEditMenu extends Menu {
  constructor(game) {
    super(game, [
      {label: 'General Game Data..', action: () => this.generalMenu()},
      {label: 'Open Level..', action: () => this.openLevel()},
      {label: 'New Level..', action: () => this.newLevel()},
      {label: 'Open Entity..', action: () => this.openEntity()},
      {label: 'New Entity..', action: () => this.newEntity()}
    ])
  }

  generalMenu() {
    const closeMenu = this.game.setDialog(new Menu(game, [
      {label: 'Reveal game package path', action: () => {
        this.game.revealFolder('.')
      }, selectable: (process.platform === 'darwin')},
      {label: 'Back', action: () => closeMenu()}
    ]))
  }

  openLevel() {
    const packagePath = this.game.pickFile({
      title: 'Open Level',
      filters: [
        {name: 'Level Files', extensions: ['json']}
      ]
    })

    if (packagePath) {
      this.game.setDialog(null)
      this.game.loadLevelmapFromFile(packagePath, {
        transition: false
      }).then(() => {
        this.game.setDialog(this.game.levelmap.editInfoMenu)
      })
    }
  }

  newLevel() {
    const packagePath = this.game.pickSaveFile({
      filters: [
        {name: 'Level File', extensions: ['json']}
      ]
    })

    if (packagePath) {
      const levelmap = new Levelmap(this.game, 10, 10, this.game.tileAtlas)
      levelmap.filePath = packagePath
      this.game.loadLevelmap(levelmap)
      this.game.saveLevelmap().then(() => {
        return this.game.loadLevelmapFromFile(packagePath, {
          transition: false
        })
      }).then(() => {
        this.game.setDialog(this.game.levelmap.editInfoMenu)
      })
    }
  }

  openEntity() {
    const packagePath = this.game.pickFile({
      title: 'Open Entity',
      filters: [
        {name: 'Entity Files', extensions: ['json']}
      ]
    })

    if (packagePath) {
      return this.game.readPackageFile(packagePath).then(save => {
        const EntityCls = class extends Entity {}
        EntityCls.clsLoadFromSaveObj(JSON.parse(save))

        const menu = new EntityEditMenu(this.game, EntityCls)
        const closeMenu = this.game.setDialog(menu)
        menu.on('closed', closeMenu)
      })
    }
  }

  newEntity() {
    const entityPath = this.game.pickSaveFile({
      filters: [
        {name: 'Entity File', extensions: ['json']}
      ]
    })

    if (entityPath) {
      const EntityCls = class extends Entity {}

      const p = path.parse(entityPath)
      const scriptPath = `${p.dir}/${p.name}.ss`

      EntityCls.scriptPath = scriptPath

      const save = JSON.stringify(EntityCls.clsGetSaveObj())

      return Promise.all([
        fsp.readFile(__dirname + '/../default-entity-script.ss')
          .then(code => this.game.writePackageFile(scriptPath, code)),

        this.game.writePackageFile(entityPath, save)
      ]).then(() => {
        const menu = new EntityEditMenu(this.game, EntityCls)
        const closeMenu = this.game.setDialog(menu)
        menu.on('closed', closeMenu)
      })
    }
  }
}
