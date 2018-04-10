const Dialog = require('./Dialog')
const helpStrings = require('./help')

module.exports = class HelpDialog extends Dialog {
  constructor(game, helpKey) {
    super(game)

    this.helpKey = helpKey
    let text
    if (helpKey in helpStrings) {
      this.text = helpStrings[helpKey]
    } else {
      this.text = helpStrings.notFound(helpKey)
    }

    this.scrollLines = 0
    this.renderLineCount = 10 // Sensible default, calculated after first draw.
  }

  drawTo(canvasTarget) {
    const ctx = canvasTarget.getContext('2d')
    ctx.fillStyle = '#131'
    ctx.fillRect(0, 0, canvasTarget.width, canvasTarget.height)

    ctx.font = `14px ${this.game.fontFamily}`
    ctx.fillStyle = 'white'

    // TODO: Move this into a separate utility file, somewhere.
    if (!this.wrappedText) {
      const wrapped = []
      const text = this.text
      const maxWidth = canvasTarget.width
      let currentLine = ''
      let charactersSinceSpace = 0
      for (let i = 0; i < text.length; i++) {
        const char = text[i]
        if (char === '\n') {
          wrapped.push(currentLine)
          currentLine = ''
          charactersSinceSpace = 0
        } else {
          if (char === ' ') {
            charactersSinceSpace = 0
          }

          const { width } = ctx.measureText(currentLine + char)
          if (width < maxWidth) {
            currentLine += char
            if (char !== ' ') charactersSinceSpace++
          } else {
            wrapped.push(currentLine.slice(0, currentLine.length - charactersSinceSpace))
            // console.log('Wrap, appending:', '{'+wrapped[wrapped.length - 1]+'}')
            // console.log('Old current line:', '{'+currentLine+'}')
            // console.log('Characters since space:', charactersSinceSpace)
            currentLine = currentLine.slice(currentLine.length - charactersSinceSpace)
            if (char !== ' ') {
              currentLine += char
            }
            // console.log('New current line:', '{'+currentLine+'}')
            charactersSinceSpace = 0
          }
        }
      }

      wrapped.push(currentLine)

      while (wrapped[wrapped.length - 1] === '') {
        wrapped.pop()
      }

      this.wrappedText = wrapped
    }

    this.renderLineCount = Math.floor(canvasTarget.height / 14)

    if (this.scrollLines < 0) {
      this.scrollLines = 0
    }

    if (this.scrollLines >= this.wrappedText.length) {
      this.scrollLines = this.wrappedText.length - 1
    }

    const renderLines = this.wrappedText.slice(
      this.scrollLines, this.scrollLines + this.renderLineCount)

    for (let row = 0; row < renderLines.length; row++) {
      ctx.fillText(renderLines[row], 0, (row + 1) * 14)
    }
  }

  tick() {
    const { keyListener } = this.game

    if (keyListener.isHelpPressed()) {
      if (this.helpKey === 'helpOnHelp') {
        this.game.showHelp('helpOnHelpOnHelp')
      } else if (this.helpKey !== 'helpOnHelpOnHelp') {
        this.game.showHelp('helpOnHelp')
      }
      return
    }

    if (keyListener.isJustPressed(27)) { // Escape
      this.emit('closed')
      return
    }

    if (keyListener.isJustPressed(38)) { // Up
      this.scrollLines--
    }

    if (keyListener.isJustPressed(40)) { // Down
      this.scrollLines++
    }

    if (
      keyListener.isJustPressed(33) || // Page-up
      (keyListener.isJustPressed(38) && keyListener.isPressed(16)) // Shift-up
    ) {
      this.scrollLines -= this.renderLineCount
    }

    if (
      keyListener.isJustPressed(34) || // Page-down
      (keyListener.isJustPressed(40) && keyListener.isPressed(16)) // Shift-down
    ) {
      this.scrollLines += this.renderLineCount
    }
  }
}
