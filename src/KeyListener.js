class KeyListener {
  // A convenient class to get pressed keys.

  constructor(el) {
    this.keys = {}

    this.initEventListeners(el)
  }

  initEventListeners(el) {
    el.addEventListener('keydown', evt => {
      this.keys[evt.keyCode] = true
    })

    el.addEventListener('keyup', evt => {
      this.keys[evt.keyCode] = false
    })
  }

  isPressed(key) {
    return !!this.keys[key]
  }
}
