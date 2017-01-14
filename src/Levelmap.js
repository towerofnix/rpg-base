class Levelmap {
  constructor(width, height, atlas, tileSize = 16) {
    this.width = width
    this.height = height
    this.tileAtlas = atlas
    this.tileSize = tileSize

    this.scrollX = 0
    this.scrollY = 0

    this.tilemap = new Tilemap(this)
    this.entitymap = new Entitymap(this)
  }

  drawTo(canvasTarget) {
    this.tilemap.drawTo(canvasTarget)
    this.entitymap.drawTo(canvasTarget)
  }

  tick() {
    this.entitymap.tick()
  }
}