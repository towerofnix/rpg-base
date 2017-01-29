const Dialog = require('./Dialog')

module.exports = class TalkDialog extends Dialog {
  // A talk dialog - the dialog you'd see whenever talking to somebody in your
  // average RPG.

  constructor(game, {
    msg = 'No dialog text set!', talkSpeed = 1,
    portrait = null,
    textBoxAlign = 'bottom', portraitBoxAlign = 'left'
  } = {}) {
    // Takes two arguments:
    //
    // (game) The game object.
    //
    // (config) All of the below, as an argument object:
    //   (msg) The message text to display.
    //   (talkSpeed) The speed at which to reveal characters. If 0, all
    //               characters will initially be visible, and there won't
    //               be any transition for new characters to be displayed.
    //               Default 1.
    //   (portrait) The package path to the portrait image. Set to null
    //              (null is default) to hide the portrait box altogether.
    //   (textBoxAlign) The side of the screen to align the text box to.
    //                  Either 'top' or 'bottom'; 'bottom' by default.
    //   (portraitBoxAlign) The side of the screen to align the portrait box 
    //                      to. Either 'left' or 'right'; 'left' by default.

    super()

    this.game = game
    this.msg = msg
    this.talkSpeed = talkSpeed

    if (portrait) {
      this.portraitImage = document.createElement('img')
      this.portraitImage.src = game.packagePath + portrait
    } else {
      this.portraitImage = null
    }

    this.textBoxAlign = textBoxAlign
    this.portraitBoxAlign = portraitBoxAlign

    this.renderMode = Dialog.DIALOG_MODE_OVERLAY

    if (this.talkSpeed === 0) {
      this.renderChars = msg.length
    } else {
      this.renderChars = 0
    }

    this.characterRevealTick = 0
  }

  drawTo(canvasTarget) {
    const ctx = canvasTarget.getContext('2d')

    const { width, height } = canvasTarget

    const [ textBoxX, textBoxY ] = [
      0,
      this.textBoxAlign === 'top' ? 0 : height - 80
    ]

    const [ portraitBoxX, portraitBoxY ] = [
      this.portraitBoxAlign === 'left' ? 0 : width - 68,
      this.textBoxAlign === 'top' ? 80 : height - 80 - 68
    ]

    ctx.fillStyle = '#FE8'
    ctx.fillRect(textBoxX, textBoxY, width, 80)

    ctx.fillStyle = 'black'
    ctx.fillRect(textBoxX + 4, textBoxY + 4, width - 8, 80 - 8)

    ctx.fillStyle = 'white'
    ctx.font = '14px manaspace'
    const text = this.msg.slice(0, this.renderChars)
    ctx.fillText(text, textBoxX + 8, textBoxY + 22)

    if (this.portraitImage) {
      ctx.fillStyle = '#FE8'
      ctx.fillRect(portraitBoxX, portraitBoxY, 68, 68)

      ctx.fillStyle = 'black'
      ctx.fillRect(portraitBoxX + 4, portraitBoxY + 4, 60, 60)

      ctx.drawImage(this.portraitImage, portraitBoxX + 4, portraitBoxY + 4)
    }

    if (this.renderChars < this.msg.length) {
      this.characterRevealTick++
      if (this.characterRevealTick === this.talkSpeed) {
        this.renderChars++
        this.characterRevealTick = 0
      }
    }
  }

  tick() {
    const { keyListener } = this.game

    const doneTalking = this.renderChars === this.msg.length

    if (doneTalking && keyListener.isActionPressed()) {
      this.emit('nextPressed')
    }
  }

  static prompt(game, config) {
    // Takes the same arguments as TalkDialog's constructor. Displays a talk
    // dialog and returns a promise that is resolved when the action/next key
    // is pressed on the dialog.

    const dialog = new TalkDialog(game, config)

    const closeDialog = game.setDialog(dialog)

    return new Promise(res => {
      dialog.on('nextPressed', () => {
        closeDialog()
        res()
      })
    })
  }
}
