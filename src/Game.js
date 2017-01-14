class Game {
  constructor(canvasTarget) {
    this.canvasTarget = canvasTarget
    this.canvasTarget.setAttribute('tabindex', 1)
    this.canvasTarget.focus()

    this.levelmap = new Levelmap(this)

    this.keyListener = new KeyListener(canvasTarget)
  }

  tick() {
    this.levelmap.tick()
  }

  draw() {
    this.levelmap.drawTo(this.canvasTarget)
  }
}
