const Menu = require('../Menu')
const { dialog } = require('electron').remote

module.exports = class GameEditMenu extends Menu {
  constructor(game) {
    super(game, [
      {label: 'Open Level..', action: () => this.openLevel()}
    ])
  }

  openLevel() {
    const openSelection = dialog.showOpenDialog({
      title: 'Open Level',
      defaultPath: this.game.packagePath,
      properties: ['openFile'],
      filters: [
        {name: 'Level Files', extensions: ['json']}
      ]
    })

    if (typeof openSelection === 'undefined') {
      // Cancelled, no file picked
      return
    }

    const { valid, packagePath } = this.game.processPath(openSelection[0])

    if (valid) {
      this.game.setDialog(null)
      this.game.loadLevelmapFromFile(packagePath, {
        transition: false,
        makeHero: true
      }).then(() => {
        this.game.setDialog(this.game.levelmap.editInfoMenu)
      })
    }
  }
}
