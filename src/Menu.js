const Dialog = require('./Dialog')

module.exports = class Menu extends Dialog {
  constructor(game, items) {
    super()

    this.game = game
    this.items = items

    this.blink = 0
    this.selectDelay = 0
    this.firstKeypress = 0

    this.selectedIndex = 0
    this.constraints(+1)
  }

  drawTo(canvasTarget) {
    const { width, height } = canvasTarget

    const ctx = canvasTarget.getContext('2d')

    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, width, height)

    ctx.font = '14px manaspace'

    for (let i = 0; i < this.items.length; i++) {
      const { label, selectable = true } = this.items[i]

      if (i === this.selectedIndex) {
        if (this.blink < 3) {
          ctx.fillStyle = 'yellow'
        } else {
          ctx.fillStyle = 'white'
        }
      } else {
        if (selectable) {
          ctx.fillStyle = '#BBB'
        } else {
          ctx.fillStyle = '#777'
        }
      }

      ctx.fillText(label, 8, (i + 1) * 14 + 8)
    }

    this.blink = (this.blink + 1) % 6
  }

  tick() {
    const { keyListener } = this.game

    const delay = this.firstKeypress ? 10 : 5

    let direction = 0

    if (keyListener.isPressed(38)) { // Up
      if (this.selectDelay === 0) {
        this.selectedIndex--
        this.selectDelay = delay
        this.firstKeypress = false
        direction = -1
      }
    } else if (keyListener.isPressed(40)) { // Down
      if (this.selectDelay === 0) {
        this.selectedIndex++
        this.selectDelay = delay
        this.firstKeypress = false
        direction = +1
      }
    } else {
      this.selectDelay = 0
      this.firstKeypress = true
    }

    if (this.selectDelay > 0) {
      this.selectDelay--
    }

    this.constraints(direction)

    // If the space or enter key is pressed, run the selected menu item's
    // action.
    if (keyListener.isJustPressed(32) || keyListener.isJustPressed(13)) {
      const { action } = this.items[this.selectedIndex]

      if (action) {
        action(this)
      }
    }

    for (let key in keyListener.keys) {
      if (keyListener.isJustPressed(key)) {
        const { keyAction } = this.items[this.selectedIndex]

        if (keyAction) {
          keyAction(parseInt(key))
        }
      }
    }
  }

  constraints(direction) {
    // Keep the selected index in range by wrapping it if it goes past the
    // ends.

    if (this.selectedIndex < 0) {
      this.selectedIndex = this.items.length - 1
    }

    if (this.selectedIndex > this.items.length - 1) {
      this.selectedIndex = 0
    }

    if (this.selectedItem.selectable === false && direction) {
      this.selectedIndex += direction
      this.constraints(direction)
    }
  }

  get selectedItem() {
    return this.items[this.selectedIndex]
  }
}
