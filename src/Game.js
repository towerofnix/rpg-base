const fsp = require('fs-promise')
const path = require('path')
const Levelmap = require('./Levelmap')
const KeyListener = require('./KeyListener')
const HeroEntity = require('./entities/HeroEntity')
const { filterOne } = require('./util')

module.exports = class Game {
  // TODO: Support having multiple heroes!

  constructor(canvasTarget, packagePath = __dirname + '/../game/') {
    this.keyListener = new KeyListener(canvasTarget)

    this.packagePath = path.normalize(packagePath)

    this.canvasTarget = canvasTarget
    this.canvasTarget.setAttribute('tabindex', 1)
    this.canvasTarget.focus()

    this.levelmap = new Levelmap(this, 0, 0, null)
    this.levelmapPath = null

    this.heroEntity = null

    this.anim = null
  }

  tick() {
    if (!this.anim) {
      this.levelmap.tick()
    }

    this.keyListener.clearJustPressed()
  }

  setupHeroEntity(hero) {
    this.heroEntity = hero
    hero.on('steppedOnDoor', (door) => {
      game.loadLevelmapFromFile(door.to, true, () => {
        const newHero = this.heroEntity
        if (newHero) {
          newHero.x = door.spawnPos[0]
          newHero.y = door.spawnPos[1]
        }
      })
    })
  }

  getHeroEntity() {
    return filterOne(
      game.levelmap.layers.map(layer => filterOne(
        layer.entitymap.entities, e => e instanceof HeroEntity
      )),
      Boolean
    )
  }

  draw() {
    const { levelmap, canvasTarget } = this

    // Make view follow hero --------------------------------------------------

    const hero = this.getHeroEntity()

    if ((levelmap.testMode || !levelmap.editorMode) && hero) {
      levelmap.scrollX = (
        hero.x - (canvasTarget.width / levelmap.tileSize / 2) +
        Math.sin(Date.now() / 500 + 800) * 0.1
      )

      levelmap.scrollY = (
        hero.y - (canvasTarget.height / levelmap.tileSize / 2) +
        Math.sin(Date.now() / 1000) * 0.1
      )
    }

    // Draw levelmap ----------------------------------------------------------

    levelmap.drawTo(canvasTarget)

    // Draw animations --------------------------------------------------------

    const ctx = canvasTarget.getContext('2d')
    if (this.anim === 'fadeOut' || this.anim === 'fadedOut') {
      const alpha = Math.min((1 / 1000) * (Date.now() - this.animTime), 1)
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`
      ctx.fillRect(0, 0, canvasTarget.width, canvasTarget.height)
    } else if (this.anim === 'fadeIn') {
      const alpha = (1 - (1 / 1000) * (Date.now() - this.animTime))
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`
      ctx.fillRect(0, 0, canvasTarget.width, canvasTarget.height)
    }
  }

  loadLevelmapFromFile(path, transition = true, initFn = null) {
    this.levelmapPath = path

    const realPath = this.packagePath + path

    let loadedCb = null

    return (transition ? this.levelTransition() : Promise.resolve())
      .then(_loadedCb => {
        loadedCb = _loadedCb

        return fsp.readFile(realPath)
      })
      .then(buf => JSON.parse(buf.toString()))
      .then(obj => {
        this.levelmap.loadFromSaveObj(obj)

        const hero = this.getHeroEntity()
        if (hero) {
          this.setupHeroEntity(hero)
        }

        if (initFn) {
          initFn()
        }

        return (loadedCb ? loadedCb() : null)
      })
  }

  saveLevelmap() {
    const realPath = this.packagePath + this.levelmapPath
    const str = JSON.stringify(this.levelmap.getSaveObj())

    return fsp.writeFile(realPath, str)
  }

  levelTransition() {
    const waitUntilAnimDone = (name) => new Promise(res => {
      this.anim = name
      this.animTime = Date.now()

      const i = setInterval(() => {
        if (Date.now() - this.animTime > 1000) {
          this.anim = null
          clearInterval(i)
          res()
        }
      }, 50)
    })

    return waitUntilAnimDone('fadeOut').then(() => {
      this.anim = 'fadedOut'
      return () => waitUntilAnimDone('fadeIn')
    })
  }
}
