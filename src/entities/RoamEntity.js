// ** OLD **

class RoamEntity extends Entity {
  constructor(...args) {
    super(...args)

    this.timer = 10
    this.randomDirection()
  }

  tick() {
    this.timer--

    if (this.timer < 10) {
      const [ prop, multiplier ] = this.direction

      this[prop] += multiplier * 0.1
      this.fixPosition()
    }

    if (this.timer === 0) {
      this.timer = 60 + Math.ceil(Math.random() * 30)
      this.randomDirection()
    }
  }

  randomDirection() {
    const right = ['x', +1]
    const left = ['x', -1]
    const up = ['y', -1]
    const down = ['y', +1]

    switch (Math.floor(Math.random() * 4)) {
      case 0:
        this.direction = left
        break
      case 1:
        this.direction = right
        break
      case 2:
        this.direction = up
        break
      case 3:
        this.direction = down
        break
    }

    // If we're going to end up moving out of the range (0, 0) -> (0, 3), we
    // need to go in a different direction. Just to give the entity an idea of
    // where we want it to stay.
    if (
      (this.x <= 0 && this.direction === left) ||
      (this.y <= 0 && this.direction === up) ||
      (this.x >= 2 && this.direction === right) ||
      (this.y >= 2 && this.direction === down)
    ) {
      this.randomDirection()
    }
  }
}
