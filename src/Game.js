const Levelmap = require('./Levelmap')
const KeyListener = require('./KeyListener')
const Dialog = require('./Dialog')
const GameEditMenu = require('./menus/GameEditMenu')
const CustomLanguage = require('./CustomLanguage')
const { confirm } = require('./menus/ConfirmMenu')
const { filterOne, asyncEach } = require('./util')

const fs = require('fs')
const path = require('path')
const util = require('util')
const { spawn } = require('child_process')
const { dialog } = require('electron').remote

const readFile = util.promisify(fs.readFile)
const writeFile = util.promisify(fs.writeFile)

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

    this.fontFamily = 'manaspace, monospace'

    this.backgroundMusicAudio = document.createElement('audio')
    this.backgroundMusicAudio.loop = true
    this.bgmPath = ''

    // The currently displayed dialog. It'll be ticked and drawn instead of
    // everything else. Often a menu.
    this.activeDialog = null

    this.gameEditMenu = new GameEditMenu(this)

    this.anim = null
    this.activeDoor = null

    // Scriptscript access
    this.customLanguage = new CustomLanguage(this)
    this.levelmapHooks = {}

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
    let p

    // If there's a dialog being displayed, we'll tick it instead of everything
    // else..
    if (this.activeDialog) {
      this.activeDialog.tick()
    } else {
      // The levelmap should only be ticked if we aren't transitioning to a new
      // level, and we can (kind of) detect that by checking if the 'anim'
      // property is set.
      if (!this.anim) {
        p = this.levelmap.tick()
      }
    }

    return Promise.resolve(p).then(() => {
      this.keyListener.clearJustPressed()
    })
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

      // Used for spawned entities to position themselves.
      this.activeDoor = door

      return this.loadLevelmapFromFile(door.to, {
        anim: true,
        loadedCb: () => {
          this.initializeLevelmap().then(() => {
            // Keep edit mode, if that was enabled.
            if (oldLevelmap.editorMode) {
              this.levelmap.editorMode = oldLevelmap.editorMode
            }

            this.activeDoor = null
          })
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

  readPackageFile(path) {
    // Reads a file given its game package path.
    // (e.g. foo/bar/baz.json vs. /projects/rpg-base/game/foo/bar/baz.json)

    const realPath = this.packagePath + path

    return readFile(realPath)
  }

  writePackageFile(path, text) {
    // Writes to a file given its game package path. The counterpart to
    // readPackageFile.

    const realPath = this.packagePath + path

    return writeFile(realPath, text)
  }

  loadLevelmapFromFile(path, {
    transition = true, loadedCb = null
  } = {}) {
    let endAnim = null

    const levelmap = new Levelmap(this, 0, 0, this.tileAtlas)
    levelmap.filePath = path

    return (transition ? this.levelTransition() : Promise.resolve())
      .then(_endAnim => {
        endAnim = _endAnim

        return this.readPackageFile(path)
      })
      .then(buf => JSON.parse(buf.toString()))
      .then(obj => {
        return levelmap.loadFromSaveObj(obj)
      })
      .then(() => {
        return this.loadLevelmap(levelmap)
      }).then(() => {
        if (loadedCb) {
          return loadedCb()
        }
      })
      .then(() => {
        return (endAnim ? endAnim() : null)
      })
  }

  loadLevelmap(levelmap) {
    return Promise.resolve().then(() => {
      this.levelmap = levelmap

      if (levelmap.scriptPath) {
        return readFile(this.packagePath + levelmap.scriptPath)
          .then(code => this.customLanguage.getHooks(code.toString()))
      } else {
        return Promise.resolve({})
      }
    }).then(levelmapHooks => {
      this.levelmapHooks = levelmapHooks

      // If no new BGM is set, we'll stick to using whatever was set before.
      if (levelmap.bgm && levelmap.bgm !== this.bgmPath) {
        this.backgroundMusicAudio.pause()
        this.backgroundMusicAudio.src = this.packagePath + levelmap.bgm
        this.bgmPath = levelmap.bgm
      }

      this._listeners.init(levelmap, 'levelmap')
    })
  }

  saveLevelmap() {
    const realPath = this.packagePath + this.levelmap.filePath
    const str = JSON.stringify(this.levelmap.getSaveObj())

    return writeFile(realPath, str)
  }

  initializeLevelmap() {
    // Initializes the loaded levelmap. This should be called immediately
    // before testing/running a levelmap. If you call it again it'll initialize
    // the level again (obviously), so you can do that if you're e.x. testing
    // the level new again.

    // We'll generally want to play the background music.
    this.backgroundMusicAudio.play()

    return asyncEach(this.levelmap.layers, layer => {
      return layer.entitymap.loadEntityData()
    })

      // We want to run the 'spawn' code after all entities have been loaded.
      // That's so that if the 'spawn' proc warps the entity to another
      // layer (particularly a layer above where it spawned - greater index),
      // that entity won't be removed when we run loadEntityData on the layer
      // it teleported to.
      //
      // Of course, if we run loadEntityData later on on the layer it's
      // positioned on, it'll be removed, but that's probably fine -- we
      // probably won't be using loadEntityData except when loading a new
      // levelmap, at which point we'd want to get rid of all entities
      // anyways.
      .then(() => asyncEach(this.levelmap.layers,
        layer => asyncEach(layer.entitymap.entities, entity => {
          if (entity.hooks.spawned) {
            return entity.hooks.spawned()
          }
        })
      ))
      // ALSO THAT CODE TOOK ME ALL OF THE 29th TO FIGURE OUT HELP ME PLEASE
      // (can we push now?)

      .then(() => {
        // If the levelmap script has a 'level-initialized' procedure, run that.
        if (this.levelmapHooks['level-initialized']) {
          return this.levelmapHooks['level-initialized']()
        } else {
          return Promise.resolve()
        }
      })
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
