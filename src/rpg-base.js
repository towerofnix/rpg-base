const splitIndexToPos = function(i, w, h, s = 1) {
  // Takes four arguments:
  //
  // (i) The index to split.
  // (w) The width of the image/level you'd split this from.
  // (h) The height of the image/level you'd split this from.
  // (s) The size of each tile in the image/level you'd split this from.
  //     Default 1.

  const x = (i * s) % w
  const y = Math.floor(i * s / w) * s

  return [x, y]
}

const joinPosToIndex = function([x, y], w, s = 1) {
  // Takes three arguments:
  //
  // (x/y) The X and Y of the split index/position. An array.
  // (w) The width of the image/level you'd have split it from.
  // (s) The size of each tile in the image/level you'd have split it from.

  const i = ((y / s) * w + x) / s

  return i
}

class TileAtlas {
  constructor(image, textureSize = 16) {
    this.image = image
    this.textureSize = textureSize
  }

  getTexturePos(id) {
    return splitIndexToPos(
      id, this.image.width, this.image.height, this.textureSize
    )
  }
}

class Tilemap {
  constructor(width, height, atlas) {
    // Takes two arguments:
    //
    // (width) The width of the tilemap, in a number of tiles.
    // (height) The height of the tilemap, in a number of tiles.
    // (atlas) The TileAtlas to use for rendering tiles.

    this.width = width
    this.height = height
    this.tileAtlas = atlas

    this.scrollX = 0
    this.scrollY = 0
    this.tileSize = 16

    this.tiles = []
    this.clearTiles()
  }

  clearTiles() {
    this.tiles.splice(0, this.tiles.length)
  }

  drawTo(canvasTarget) {
    const { tileSize, scrollX, scrollY } = this,
          { width: canvasWidth, height: canvasHeight } = canvasTarget

    // We don't want to render tiles that aren't in our tilemap, so we apply
    // these constraints to each start/end parse position.
    const constrainX = x => Math.max(0, Math.min(this.width, x))
    const constrainY = y => Math.max(0, Math.min(this.height, y))

    const startParseX = constrainX(Math.floor(scrollX))
    const startParseY = constrainY(Math.floor(scrollY))

    const endParseX = constrainX(Math.ceil(scrollX + canvasWidth / tileSize))
    const endParseY = constrainY(Math.ceil(scrollY + canvasHeight / tileSize))

    const ctx = canvasTarget.getContext('2d')

    for (let x = startParseX; x < endParseX; x++) {
      for (let y = startParseY; y < endParseY; y++) {
        const id = this.getTileAt(x, y)

        ctx.drawImage(
          this.tileAtlas.image,

          ...this.tileAtlas.getTexturePos(id),

          this.tileAtlas.textureSize, this.tileAtlas.textureSize,

          Math.floor((x - scrollX) * tileSize),
          Math.floor((y - scrollY) * tileSize),

          tileSize, tileSize
        )
      }
    }
  }

  getTileAt(tileX, tileY) {
    // Gets the tile at the given tileX and tileY position. The increment
    // between each number should be 1, not tileSize (that means [0, 1, 2, 3],
    // not [0, 16, 32, 48]).

    const i = joinPosToIndex([tileX, tileY], this.width, 1)

    return this.tiles[i]
  }
}

class Levelmap {
  constructor(width, height, atlas) {
    this.tileAtlas = atlas
    this.tilemap = new Tilemap(width, height, atlas)
  }

  drawTo(canvasTarget) {
    this.tilemap.drawTo(canvasTarget)
  }
}

// ----------------------------------------------------------------------------

const waitUntilLoaded = function(obj) {
  return new Promise((resolve) => {
    obj.addEventListener('load', () => resolve(obj))
  })
}

const atlasImage = new Image()
atlasImage.src = './game/atlas.png'
const tileAtlas = new TileAtlas(atlasImage, 16)

Promise.all([atlasImage].map(waitUntilLoaded)).then(() => {
  const canvasTarget = document.getElementById('target')
  canvasTarget.width = 250
  canvasTarget.height = 250

  const levelmap = new Levelmap(11, 4, tileAtlas)
  levelmap.tilemap.tiles = [
    0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
    0x00, 0x00, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
    0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
  ]

  const draw = function() {
    const ctx = canvasTarget.getContext('2d')
    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, canvasTarget.width, canvasTarget.height)

    levelmap.drawTo(canvasTarget)
    levelmap.tilemap.scrollX = Math.sin(Date.now() / 500 + 800)
    levelmap.tilemap.scrollY = Math.sin(Date.now() / 1000)

    requestAnimationFrame(draw)
  }

  draw()
})
