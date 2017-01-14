class Levelmap {
  constructor(game, width, height, atlas, tileSize = 16) {
    this.game = game
    this.width = width
    this.height = height
    this.tileAtlas = atlas
    this.tileSize = tileSize

    this.scrollX = 0
    this.scrollY = 0

    this.tilemap = new Tilemap(this)
    this.wallmap = new Wallmap(this)
    this.entitymap = new Entitymap(this)
  }

  drawTo(canvasTarget) {
    this.tilemap.drawTo(canvasTarget)
    this.entitymap.drawTo(canvasTarget)
    this.wallmap.drawTo(canvasTarget)
  }

  tick() {
    this.entitymap.tick()
  }
}
