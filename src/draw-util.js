function blink() {
  // Returns THE blink. Use for all blinking elements. Keeps things in sync.

  return 0.75 + 0.25 * Math.sin(Date.now() / 200)
}

module.exports.blink = blink
