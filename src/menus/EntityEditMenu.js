const Menu = require('../Menu')
const ConfirmCloseMenu = require('./ConfirmCloseMenu')

module.exports = class EntityEditMenu extends Menu {
  constructor(game, EntityCls) {
    const scriptPathItem = {
      get label() {
        return EntityCls.scriptPath || '(None set)'
      },

      action: () => this.revealScript()
    }

    super(game, [
      {label: 'Script path:', selectable: false},
      scriptPathItem,

      {label: '', selectable: false},

      {label: 'Edit script..', action: () => this.editScript()},
      {label: 'Close', action: () => this.close()}
    ])

    // Is this the right casing?
    this.EntityCls = EntityCls
  }

  editScript() {
    // Eventually(?) I'll actually make an editor for these scripts, but for
    // now this works..
    this.revealScript()
  }

  revealScript() {
    this.game.revealPath(this.EntityCls.scriptPath)
  }

  close() {
    // The code is here to handle a more complicated entity but right now
    // that's not necessary since all of the entity editing happens outside of
    // the RPG Base program...

    /*
    const menu = new ConfirmCloseMenu(this.game)

    menu.on('discard-closed', () => {
      this.emit('closed')
    })

    menu.on('save-closed', () => {
      const save = JSON.stringify(this.EntityCls.clsGetSaveObj())

      this.game.writePackageFile(this.EntityCls.filePath, save).then(() => {
        this.emit('closed')
      })
    })

    menu.on('canceled', () => {
      closeMenu()
    })

    const closeMenu = this.game.setDialog(menu)
    */

    this.emit('closed')
  }
}
