const EventEmitter = require('events')
const { filterOne } = require('./util')

module.exports = class Entity extends EventEmitter {
  constructor(levelmap) {
    super()

    this.levelmap = levelmap
    this.x = 0
    this.y = 0
    this.lastX = 0
    this.lastY = 0

    this.hooks = {}
  }

  // Is this how you're supposed to do (modifiable) class properties?
  static get scriptPath() { return this._scriptPath || '' }
  static set scriptPath(newPath) { this._scriptPath = newPath }
  get scriptPath() { return this.constructor.scriptPath }

  static get filePath() { return this._filePath || '' }
  static set filePath(newPath) { this._filePath = newPath }

  tick() {
    // Override me! (And probably call super.tick.)

    this.lastX = this.x
    this.lastY = this.y
  }

  fixPosition() {
    // Stupid math issues cause numbers to become weird decimal versions of
    // themselves when doing arithmetic/incrementing/decrementing/etc, so we
    // need to round them to just the hundredths decimal place (since that's
    // all the precision we need).
    this.x = Math.round(this.x * 100) / 100
    this.y = Math.round(this.y * 100) / 100
  }

  getAllowedMovement() {
    const layer = this.layer

    if (layer) {
      const movement = layer.wallmap.getAllowedMovement(this.x, this.y)

      return movement
    } else {
      return {left: false, right: false, up: false, down: false}
    }
  }

  get layer() {
    return filterOne(this.levelmap.layers, layer => (
     layer.entitymap.entities.includes(this)
    ))
  }

  get moved() {
    return (this.lastX !== this.x) || (this.lastY !== this.y)
  }

  static clsLoadFromSaveObj(save) {
    const { scriptPath = '' } = save

    this.scriptPath = scriptPath
  }

  static clsGetSaveObj() {
    return {
      scriptPath: this.scriptPath
    }
  }
}
