const Levelmap = require('./Levelmap')
const KeyListener = require('./KeyListener')
const HeroEntity = require('./entities/HeroEntity')
const Dialog = require('./Dialog')
const GameEditMenu = require('./menus/GameEditMenu')
const { confirm } = require('./menus/ConfirmMenu')
const { filterOne } = require('./util')

const fsp = require('fs-promise')
const path = require('path')
const { spawn } = require('child_process')
const { dialog } = require('electron').remote

module.exports = class Game {
  // TODO: Support having multiple heroes!

  constructor(canvasTarget, packagePath = __dirname + '/../game/') {
    this.keyListener = new KeyListener(canvasTarget)

    this.packagePath = path.normalize(packagePath)

    this.canvasTarget = canvasTarget
    this.canvasTarget.setAttribute('tabindex', 1)
    this.canvasTarget.focus()

    this.levelmap = new Levelmap(this, 0, 0, null)

    this.heroEntity = null
    this.tileAtlas = null

    this.backgroundMusicAudio = document.createElement('audio')
    this.backgroundMusicAudio.loop = true
    this.bgmPath = ''

    // The currently displayed dialog. It'll be ticked and drawn instead of
    // everything else. Often a menu.
    this.activeDialog = null

    this.gameEditMenu = new GameEditMenu(this)

    this.anim = null

    // Dealing with javascript here, it's annoying.
    this._listeners = {
      heroEntity: {
        steppedOnDoor: door => this.heroSteppedOnDoor(door)
      },

      levelmap: {
        closed: level => this.levelClosed(level),
        testModeEnabled: () => this.testModeEnabled(),
        testModeDisabled: () => this.testModeDisabled()
      },

      init(obj, dictKey) {
        const dict = this[dictKey]
        for (let eventName of Object.keys(dict)) {
          const fn = dict[eventName]
          obj.removeListener(eventName, fn)
          obj.on(eventName, fn)
        }
      }
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

  setDialog(newDialog) {
    // Sets the dialog being displayed. This also returns a function to return
    // to the old dialog. If the new dialog is different from the old dialog,
    // its 'show' method will be called.

    const oldDialog = this.activeDialog

    this.activeDialog = newDialog

    if (newDialog && newDialog !== oldDialog) {
      newDialog.show()
    }

    return () => {
      this.activeDialog = oldDialog
    }
  }

  setupHeroEntity(hero) {
    this.heroEntity = hero
    this._listeners.init(this.heroEntity, 'heroEntity')
  }

  heroSteppedOnDoor(door) {
    const oldLevelmap = this.levelmap

    const p = (
      (this.levelmap.editorMode === Levelmap.EDITOR_MODE_TEST)
      ? confirm(this, 'Leave level?\nDiscards unsaved changes.')
      : Promise.resolve(true)
    )

    p.then(should => {
      if (!should) {
        return
      }

      return this.loadLevelmapFromFile(door.to, {
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
    })
  }

  levelClosed(level) {
    this.setDialog(this.gameEditMenu)
  }

  testModeEnabled() {
    this.backgroundMusicAudio.play()
  }

  testModeDisabled() {
    this.backgroundMusicAudio.pause()
  }

  draw() {
    // Dialog (replace) -------------------------------------------------------

    // If there's a dialog open, and its render mode is REPLACE, it should be
    // rendered instead of everything else.
    if (this.activeDialog) {
      if (this.activeDialog.renderMode === Dialog.DIALOG_MODE_REPLACE) {
        this.activeDialog.drawTo(this.canvasTarget)
        return
      }
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

    // Dialog (overlay) -------------------------------------------------------

    // If there's a dialog open, and its render mode is OVERLAY, it should be
    // rendered on top of everything else. Since everything else is already
    // drawn by this point, now's the time to render the dialog..

    if (this.activeDialog) {
      if (this.activeDialog.renderMode === Dialog.DIALOG_MODE_OVERLAY) {
        this.activeDialog.drawTo(canvasTarget)
      }
    }
  }

  loadLevelmapFromFile(path, {
    transition = true, loadedCb = null, makeHero = false
  } = {}) {
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

    // If no new BGM is set, we'll stick to using whatever was set before.
    if (levelmap.bgm && levelmap.bgm !== this.bgmPath) {
      this.backgroundMusicAudio.pause()
      this.backgroundMusicAudio.src = this.packagePath + levelmap.bgm
      this.bgmPath = levelmap.bgm
    }

    const hero = this.heroEntity
    if (hero) {
      this.setupHeroEntity(hero)
    }

    this._listeners.init(levelmap, 'levelmap')
  }

  saveLevelmap() {
    const realPath = this.packagePath + this.levelmap.filePath
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

  revealFolder(p) {
    // Open is a shell utility only available on macOS.
    if (process.platform === 'darwin') {
      spawn('open', ['-a', 'Finder', this.packagePath + p])
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

  pickFile(config = {}) {
    return this._handlePickedFile((dialog.showOpenDialog(Object.assign({
      properties: ['openFile'],
      defaultPath: this.packagePath
    }, config)) || [])[0])
  }

  pickSaveFile(config = {}) {
    return this._handlePickedFile(dialog.showSaveDialog(Object.assign({
      defaultPath: this.packagePath
    }, config)))
  }

  _handlePickedFile(selection) {
    if (typeof selection === 'undefined') {
      return null
    }

    const { valid, packagePath } = this.processPath(selection)

    if (valid) {
      return packagePath
    } else {
      return null // TODO: Error message?
    }
  }
}
