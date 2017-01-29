const Menu = require('../Menu')

// Call it a dumb class and then kill me, eev.ee readers
// (but this would actually be nice as a function)
// (don't actually kill me etc)
module.exports = class ConfirmCloseMenu extends Menu {
  constructor(game) {
    const discardChangesItem = {
      label: 'Yes, discard changes', action: () => {
        this.emit('discard-closed')
      }
    }

    const saveChangesItem = {
      label: 'Yes, save changes', action: () => {
        this.emit('save-closed')
      }
    }

    const cancelItem = {
      label: 'No, cancel', action: () => {
        this.emit('canceled')
      }
    }

    super(game, [
      {label: 'Close the level?', selectable: false},
      {label: 'Discards unsaved changes.', selectable: false},
      {label: '', selectable: false},
      discardChangesItem,
      saveChangesItem,
      cancelItem
    ])

    this.selectedIndex = this.items.indexOf(saveChangesItem)
  }
}
