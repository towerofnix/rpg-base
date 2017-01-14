const waitUntilLoaded = function(obj) {
  return new Promise((resolve) => {
    obj.addEventListener('load', () => resolve(obj))
  })
}

const dep = p => {
  const script = document.createElement('script')
  script.src = p
  document.body.appendChild(script)
  return waitUntilLoaded(script)
}

let tileAtlas
let game

Promise.all([
  dep('src/util.js'),
  dep('src/KeyListener.js'),
  dep('src/TileAtlas.js'),

  dep('src/Game.js'),

  dep('src/Entity.js')
    .then(() => dep('src/entities/HeroEntity.js')),

  dep('src/Entitymap.js'),
  dep('src/Tilemap.js'),
  dep('src/Wallmap.js'),
  dep('src/Levelmap.js')
]).then(() => {
  const atlasImage = new Image()
  atlasImage.src = './game/atlas.png'

  tileAtlas = new TileAtlas(atlasImage, 16)

  return waitUntilLoaded(atlasImage)
}).then(() => {
  const canvasTarget = document.getElementById('target')
  canvasTarget.width = 250
  canvasTarget.height = 250

  game = new Game(canvasTarget)

  game.levelmap.width = 11
  game.levelmap.height = 5
  game.levelmap.tileAtlas = tileAtlas
  game.levelmap.tilemap.tiles = [
    0x01, 0x01, 0x01, 0x01, 0x02, 0x02, 0x02, 0x02, 0x02, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x01, 0x01, 0x02,
    0x01, 0x02, 0x02, 0x02, 0x02, 0x02, 0x01, 0x00, 0x01, 0x02, 0x02
  ]

  game.levelmap.wallmap.walls = [
    0b0000, 0b0000, 0b0000, 0b0000, 0b0011, 0b0010, 0b0010, 0b0010, 0b0010, 0b0001, 0b0000,
    0b0000, 0b0000, 0b0000, 0b0000, 0b0000, 0b0000, 0b0000, 0b0000, 0b0000, 0b0000, 0b0000,
    0b0000, 0b0000, 0b0000, 0b0000, 0b0000, 0b0000, 0b0000, 0b0000, 0b0000, 0b0000, 0b0000,
    0b0000, 0b0000, 0b0000, 0b0000, 0b0000, 0b0000, 0b0000, 0b0000, 0b0000, 0b0000, 0b1001,
    0b0000, 0b1001, 0b1000, 0b1000, 0b1000, 0b1100, 0b0000, 0b0000, 0b0000, 0b1001, 0b0000,
  ]

  game.levelmap.entitymap.loadEntityData([
    [HeroEntity, 5, 2]
  ])

  const draw = function() {
    const ctx = canvasTarget.getContext('2d')
    ctx.fillStyle = '#25A'
    ctx.fillRect(0, 0, canvasTarget.width, canvasTarget.height)

    const hero = filterOne(
      game.levelmap.entitymap.entities, e => e instanceof HeroEntity
    )

    game.levelmap.scrollX = (
      hero.x - (canvasTarget.width / game.levelmap.tileSize / 2) +
      Math.sin(Date.now() / 500 + 800) * 0.3
    )

    game.levelmap.scrollY = (
      hero.y - (canvasTarget.height / game.levelmap.tileSize / 2) +
      Math.sin(Date.now() / 1000) * 0.3
    )

    game.tick()
    game.draw()

    requestAnimationFrame(draw)
  }

  draw()
})
