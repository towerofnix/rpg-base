const Dialog = require('./Dialog')

module.exports = class Menu extends Dialog {
  // A menu.
  //
  // Make sure you give the menu some items. Just pass it as an array of items
  // as the second argument to super (or new Menu). Each menu item should be an
  // object of this format:
  //
  //  {
  //     label: // The label of the menu item.
  //     action: // The result of selecting this menu item, a function.
  //     keyAction: // A function that's called every time a key is pressed on
  //                // this menu item. Obviously you don't *need* to handle
  //                // this.
  //  }
  //
  // Emits the 'canceled' event when the escape key is pressed.

  constructor(game, items) {
    super(game)

    this.items = items

    this.blink = 0
    this.selectDelay = 0
    this.firstKeypress = 0

    this.selectedIndex = 0
    this.constraints(+1)

    this.helpKey = 'menuWithoutHelpKey'
  }

  drawTo(canvasTarget) {
    const { width, height } = canvasTarget

    const ctx = canvasTarget.getContext('2d')

    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, width, height)

    ctx.font = `14px ${this.game.fontFamily}`

    let lineNum = 0

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

      const lines = label.split('\n')

      for (let line of lines) {
        ctx.fillText(line, 8, (lineNum + 1) * 14 + 8)
        lineNum++
      }
    }

    this.blink = (this.blink + 1) % 6
  }

  tick() {
    const { keyListener } = this.game

    if (keyListener.isJustPressed(27)) { // Escape
      this.emit('canceled')
      return
    }

    const delay = this.firstKeypress ? 10 : 5

    let direction = 0

    if (keyListener.isHelpPressed()) {
      this.game.showHelp(this.helpKey)
      return
    } else if (keyListener.isPressed(38)) { // Up
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

    // If the action key is pressed, run the selected menu item's
    // action.
    if (keyListener.isActionPressed()) {
      const { action } = this.selectedItem

      if (action) {
        action(this)
      }
    }

    for (let key in keyListener.keys) {
      if (keyListener.isJustPressed(key)) {
        const { keyAction } = this.selectedItem

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
