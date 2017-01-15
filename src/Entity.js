class Entity {
  constructor(levelmap) {
    this.levelmap = levelmap
    this.x = 0
    this.y = 0
    this.layer = -1 // The entity should usually be on the top layer.
  }

  tick() {}

  fixPosition() {
    // Stupid math issues cause numbers to become weird decimal versions of
    // themselves when doing arithmetic/incrementing/decrementing/etc, so we
    // need to round them to just the hundredths decimal place (since that's
    // all the precision we need).
    this.x = Math.round(this.x * 100) / 100
    this.y = Math.round(this.y * 100) / 100
  }

  getAllowedMovement() {
    const layer = this.levelmap.getLayer(this.layer)
    const movement = layer.wallmap.getAllowedMovement(this.x, this.y)

    return movement
  }
}
