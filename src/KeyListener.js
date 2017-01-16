module.exports = class KeyListener {
  // A convenient class to get pressed keys.

  constructor(el) {
    this.keys = {}
    this.justPressedKeys = {}

    this.initEventListeners(el)
  }

  initEventListeners(el) {
    el.addEventListener('keydown', evt => {
      this.keys[evt.keyCode] = true
      this.justPressedKeys[evt.keyCode] = true
    })

    el.addEventListener('keyup', evt => {
      this.keys[evt.keyCode] = false
    })
  }

  isPressed(key) {
    return !!this.keys[key]
  }

  isJustPressed(key) {
    return !!this.justPressedKeys[key]
  }

  clearJustPressed() {
    // Call this every render, after everything that might use isJustPressed is
    // done.

    this.justPressedKeys = {}
  }
}
