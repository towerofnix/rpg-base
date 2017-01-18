const Entity = require('../Entity')

module.exports = class HeroEntity extends Entity {
  tick() {
    const { keyListener } = this.levelmap.game

    const left = ['x', -1]
    const right = ['x', +1]
    const up = ['y', -1]
    const down = ['y', +1]

    if (!this.direction) {
      const movement = this.getAllowedMovement()

      if (keyListener.isPressed(39) && movement.right) {
        this.direction = right
      }

      if (keyListener.isPressed(38) && movement.up) {
        this.direction = up
      }

      if (keyListener.isPressed(37) && movement.left) {
        this.direction = left
      }

      if (keyListener.isPressed(40) && movement.down) {
        this.direction = down
      }
    }

    if (this.direction) {
      const [ prop, multiplier ] = this.direction

      this[prop] += multiplier * 0.1
      this.fixPosition()

      if (Number.isInteger(this[prop])) {
        this.direction = null
      }
    }

    if (Number.isInteger(this.x) && Number.isInteger(this.y)) {
      const door = this.layer.doormap.getItemAt(this.x, this.y)

      if (door) {
        const doorData = this.levelmap.doors[door - 1]

        this.emit('steppedOnDoor', doorData)
      }
    }
  }
}
