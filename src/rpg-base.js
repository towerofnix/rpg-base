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

Promise.all([
  'src/Entity.js',
  'src/Entitymap.js',
  'src/HeroEntity.js',
  'src/Levelmap.js',
  'src/TileAtlas.js',
  'src/Tilemap.js',
  'src/util.js'
].map(dep)).then(() => {
  const atlasImage = new Image()
  atlasImage.src = './game/atlas.png'

  tileAtlas = new TileAtlas(atlasImage, 16)

  return waitUntilLoaded(atlasImage)
}).then(() => {
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

  levelmap.entitymap.loadEntityData([
    [HeroEntity, 0, 0]
  ])

  const draw = function() {
    const ctx = canvasTarget.getContext('2d')
    ctx.fillStyle = '#25A'
    ctx.fillRect(0, 0, canvasTarget.width, canvasTarget.height)

    levelmap.tick()
    levelmap.drawTo(canvasTarget)

    const hero = filterOne(
      levelmap.entitymap.entities, e => e instanceof HeroEntity
    )

    levelmap.scrollX = (
      hero.x - (canvasTarget.width / levelmap.tileSize / 2) +
      Math.sin(Date.now() / 500 + 800) * 0.3
    )

    levelmap.scrollY = (
      hero.y - (canvasTarget.height / levelmap.tileSize / 2) +
      Math.sin(Date.now() / 1000) * 0.3
    )

    requestAnimationFrame(draw)
  }

  draw()
})
