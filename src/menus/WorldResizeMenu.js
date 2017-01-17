const Menu = require('../Menu')

module.exports = class WorldResizeMenu extends Menu {
  constructor(levelmap) {
    let newWidth = levelmap.width
    let newHeight = levelmap.height

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

    super(levelmap.game, [
      widthMenuItem, heightMenuItem,
      {label: 'Confirm', action: () => {
        levelmap.resize(newWidth, newHeight)
        this.emit('confirmed')
      }},
      {label: 'Cancel', action: () => {
        this.emit('canceled')
      }}
    ])
  }
}
