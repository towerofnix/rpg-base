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
    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, canvasTarget.width, canvasTarget.height)

    levelmap.tick()
    levelmap.drawTo(canvasTarget)
    levelmap.scrollX = Math.sin(Date.now() / 500 + 800) - 5
    levelmap.scrollY = Math.sin(Date.now() / 1000) - 5

    requestAnimationFrame(draw)
  }

  draw()
})
