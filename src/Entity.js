class Entity {
  constructor(levelmap) {
    this.levelmap = levelmap
    this.x = 0
    this.y = 0
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
}
