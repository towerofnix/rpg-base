const Menu = require('../Menu')

module.exports = class ConfirmMenu extends Menu {
  constructor(game, msg = 'Are you sure?', defaultSelection = true) {
    super(game, [
      {label: msg, selectable: false},
      {label: '', selectable: false},
      {label: 'Yes', action: () => this.emit('yesSelected')},
      {label: 'No', action: () => this.emit('noSelected')}
    ])

    if (defaultSelection === false) {
      this.selectedIndex = 4
    } else {
      this.selectedIndex = 2
    }
  }

  static confirm(game, msg, defaultSelection) {
    const menu = new ConfirmMenu(game, msg, defaultSelection)
    const closeMenu = game.setDialog(menu)

    return new Promise(res => {
      menu.on('yesSelected', () => {
        closeMenu()
        res(true)
      })

      menu.on('noSelected', () => {
        closeMenu()
        res(false)
      })
    })
  }
}
