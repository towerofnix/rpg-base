const TileAtlas = require('./TileAtlas')
const Game = require('./Game')
const { EDITOR_MODE_DOORMAP } = require('./Levelmap')
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

  game.levelmap.tileAtlas = tileAtlas

  // No transition
  return game.loadLevelmapFromFile('/test/newertest.json', false)
}).then(() => {
  const hero = null

  game.levelmap.editorMode = EDITOR_MODE_DOORMAP

  const draw = function() {
    const canvasTarget = document.getElementById('target')

    const ctx = canvasTarget.getContext('2d')
    ctx.fillStyle = '#25A'
    ctx.fillRect(0, 0, canvasTarget.width, canvasTarget.height)

    game.tick()
    game.draw()

    requestAnimationFrame(draw)
  }

  draw()
})
