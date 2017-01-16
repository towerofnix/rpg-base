const TileAtlas = require('./TileAtlas')
const Game = require('./Game')
const { filterOne } = require('./util')

const HeroEntity = require('./entities/HeroEntity')

const waitUntilLoaded = function(obj) {
  return new Promise((resolve) => {
    obj.addEventListener('load', () => resolve(obj))
  })
}

let tileAtlas
let game

const atlasImage = new Image()
atlasImage.src = './game/atlas.png'

tileAtlas = new TileAtlas(atlasImage, 16)

waitUntilLoaded(atlasImage).then(() => {
  const canvasTarget = document.getElementById('target')
  canvasTarget.width = 256
  canvasTarget.height = 256

  game = new Game(canvasTarget)
  window.game = game

  // game.levelmap.width = 11
  // game.levelmap.height = 5
  game.levelmap.tileAtlas = tileAtlas

  // game.levelmap.layers[0].tilemap.tiles = [
  //   0x03, 0x03, 0x03, 0x03, 0x03, 0x03, 0x03, 0x03, 0x03, 0x03, 0x03,
  //   0x03, 0x03, 0x03, 0x03, 0x03, 0x03, 0x03, 0x03, 0x03, 0x03, 0x03,
  //   0x03, 0x03, 0x03, 0x03, 0x03, 0x03, 0x03, 0x03, 0x03, 0x03, 0x03,
  //   0x03, 0x03, 0x03, 0x03, 0x03, 0x03, 0x03, 0x03, 0x03, 0x03, 0x03,
  //   0x03, 0x03, 0x03, 0x03, 0x03, 0x03, 0x03, 0x03, 0x03, 0x03, 0x03
  // ]

  // const newLayer = game.levelmap.createLayer()

  // newLayer.tilemap.tiles = [
  //   0x02, 0x02, 0x02, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x02,
  //   0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x02,
  //   0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x02, 0x02, 0x02,
  //   0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x02, 0x01, 0x02, 0x02, 0x00,
  //   0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x01, 0x02, 0x00, 0x00
  // ]

  // newLayer.wallmap.walls = [
  //   0b0110, 0b0000, 0b0000, 0b0000, 0b0011, 0b0010, 0b0010, 0b0010, 0b0110, 0b0000, 0b0000,
  //   0b0000, 0b0000, 0b0000, 0b0000, 0b0000, 0b0000, 0b0000, 0b0000, 0b0000, 0b0000, 0b0000,
  //   0b0000, 0b0000, 0b0000, 0b0000, 0b0000, 0b0000, 0b0000, 0b0000, 0b0000, 0b0000, 0b0000,
  //   0b0000, 0b0000, 0b0000, 0b0000, 0b0000, 0b0000, 0b0000, 0b0000, 0b0000, 0b0000, 0b1001,
  //   0b0000, 0b1001, 0b1000, 0b1000, 0b1000, 0b1100, 0b0000, 0b0000, 0b0000, 0b1001, 0b0000,
  // ]

  // game.levelmap.layers.push(newLayer)

  game.levelmap.width = 3
  game.levelmap.height = 3

  game.levelmap.layers.pop() // Remove the default layer

  for (let i = 0; i < 3; i++) {
    const newLayer = game.levelmap.createLayer()
    newLayer.tilemap.tiles = [0, 0, 0, 0, 0, 0, 0, 0, 0]
    newLayer.tilemap.tiles[i * 3] = i + 1
    game.levelmap.layers.push(newLayer)
  }

  game.levelmap.entitymap.loadEntityData([
    [HeroEntity, 5, 2]
  ])

  game.levelmap.editMode = true

  const draw = function() {
    const ctx = canvasTarget.getContext('2d')
    ctx.fillStyle = '#25A'
    ctx.fillRect(0, 0, canvasTarget.width, canvasTarget.height)

    const hero = filterOne(
      game.levelmap.entitymap.entities, e => e instanceof HeroEntity
    )

    if (game.levelmap.testMode) {
      game.levelmap.scrollX = (
        hero.x - (canvasTarget.width / game.levelmap.tileSize / 2) +
        Math.sin(Date.now() / 500 + 800) * 0.3
      )

      game.levelmap.scrollY = (
        hero.y - (canvasTarget.height / game.levelmap.tileSize / 2) +
        Math.sin(Date.now() / 1000) * 0.3
      )
    }

    game.tick()
    game.draw()

    requestAnimationFrame(draw)
  }

  draw()
})
