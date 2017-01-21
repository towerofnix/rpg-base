const Menu = require('../Menu')
const Levelmap = require('../Levelmap')
const ConfirmMenu = require('./ConfirmMenu')

module.exports = class GameEditMenu extends Menu {
  constructor(game) {
    super(game, [
      {label: 'General Game Data..', action: () => this.generalMenu()},
      {label: 'Open Level..', action: () => this.openLevel()},
      {label: 'New Level..', action: () => this.newLevel()}
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
        transition: false,
        makeHero: true
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
          transition: false,
          makeHero: true
        })
      }).then(() => {
        this.game.setDialog(this.game.levelmap.editInfoMenu)
      })
    }
  }
}
