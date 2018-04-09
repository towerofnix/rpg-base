const Dialog = require('./Dialog')

module.exports = class InfoDialog extends Dialog {
  constructor(game, text = '') {
    super(game)

    this.text = text
    this.timer = null
  }

  drawTo(canvasTarget) {
    if (this.text.length) {
      const ctx = canvasTarget.getContext('2d')
      ctx.fillStyle = '#007'
      ctx.fillRect(0, 0, canvasTarget.width, canvasTarget.height)

      ctx.font = `14px ${this.game.fontFamily}`
      ctx.textAlign = 'center'
      ctx.fillStyle = 'white'
      ctx.fillText(
        this.text,
        canvasTarget.width / 2,
        canvasTarget.height / 2 + 5
      )
    }
  }

  setText(text) {
    if (this.timer) {
      clearTimeout(this.timer)
    }

    this.text = text
  }

  timerText(text, ms = 2000) {
    this.setText(text)

    this.timer = setTimeout(() => {
      this.text = ''
    }, ms)
  }
}
