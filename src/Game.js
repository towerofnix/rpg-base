const Levelmap = require('./Levelmap')
const KeyListener = require('./KeyListener')
const HeroEntity = require('./entities/HeroEntity')
const GameEditMenu = require('./menus/GameEditMenu')
const { filterOne } = require('./util')

const fsp = require('fs-promise')
const path = require('path')
const { spawn } = require('child_process')

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
    this.tileAtlas = null

    // The currently displayed dialog. It'll be ticked and drawn instead of
    // everything else. Often a menu.
    this.activeDialog = null

    this.gameEditMenu = new GameEditMenu(this)

    this.anim = null

    // Dealing with javascript here, it's annoying.
    this._listeners = {
      heroSteppedOnDoor: door => this.heroSteppedOnDoor(door)
    }
  }

  tick() {
    // If there's a dialog being displayed, we'll tick it instead of everything
    // else..
    if (this.activeDialog) {
      this.activeDialog.tick()
    } else {
      // The levelmap should only be ticked if we aren't transitioning to a new
      // level, and we can (kind of) detect that by checking if the 'anim'
      // property is set.
      if (!this.anim) {
        this.levelmap.tick()
      }
    }

    this.keyListener.clearJustPressed()
  }

  setDialog(dialog) {
    // Sets the dialog being displayed. This also returns a function to return
    // to the old dialog.

    const oldDialog = this.activeDialog

    this.activeDialog = dialog

    return () => {
      this.activeDialog = oldDialog
    }
  }

  setupHeroEntity(hero) {
    this.heroEntity = hero
    hero.removeListener('steppedOnDoor', this._listeners.heroSteppedOnDoor)
    hero.on('steppedOnDoor', this._listeners.heroSteppedOnDoor)
  }

  heroSteppedOnDoor(door) {
    const oldLevelmap = this.levelmap

    this.loadLevelmapFromFile(door.to, {
      anim: true,
      loadedCb: () => {
        const newHero = new HeroEntity(this.levelmap)
        this.setupHeroEntity(newHero)
        newHero.x = door.spawnPos[0]
        newHero.y = door.spawnPos[1]

        const layer = this.levelmap.layers[door.spawnPos[2] || 0]
        if (layer) {
          layer.entitymap.entities.push(newHero)
        } else {
          throw new Error('Door targets nonexistant layer')
        }

        // Keep edit mode, if that was enabled.
        if (oldLevelmap.editorMode) {
          this.levelmap.editorMode = oldLevelmap.editorMode
        }
      }
    })
  }

  draw() {
    // If there's a dialog open, it should be rendered instead of everything
    // else..
    if (this.activeDialog) {
      this.activeDialog.drawTo(this.canvasTarget)
      return
    }

    const { levelmap, canvasTarget } = this

    // Make view follow hero --------------------------------------------------

    const hero = this.heroEntity

    if ((
      !levelmap.editorMode || levelmap.editorMode === Levelmap.EDITOR_MODE_TEST
    ) && hero) {
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

  loadLevelmapFromFile(path, {
    transition = true, loadedCb = null, makeHero = false
  } = {}) {
    this.levelmapPath = path

    const realPath = this.packagePath + path

    let endAnim = null

    return (transition ? this.levelTransition() : Promise.resolve())
      .then(_endAnim => {
        endAnim = _endAnim

        return fsp.readFile(realPath)
      })
      .then(buf => JSON.parse(buf.toString()))
      .then(obj => {
        const levelmap = new Levelmap(this, 0, 0, this.tileAtlas)
        levelmap.filePath = path
        levelmap.loadFromSaveObj(obj)
        this.loadLevelmap(levelmap)

        if (makeHero) {
          const hero = new HeroEntity(levelmap)
          this.setupHeroEntity(hero)

          const [ x, y, layer ] = levelmap.defaultSpawnPos

          hero.x = x
          hero.y = y
          levelmap.layers[layer].entitymap.entities.push(hero)
        }

        if (loadedCb) {
          loadedCb()
        }

        return (endAnim ? endAnim() : null)
      })
  }

  loadLevelmap(levelmap) {
    this.levelmap = levelmap

    const hero = this.heroEntity
    if (hero) {
      this.setupHeroEntity(hero)
    }
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

  revealPath(p) {
    // Open-reveal is a shell utility only available on macOS.
    if (process.platform === 'darwin') {
      spawn('open', ['-R', this.packagePath + p])
    }
  }

  processPath(p) {
    if (p.startsWith(this.packagePath)) {
      return {
        valid: true,
        packagePath: path.relative(this.packagePath, p)
      }
    } else {
      return {valid: false}
    }
  }
}
