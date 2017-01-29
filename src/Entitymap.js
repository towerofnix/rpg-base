const Entity = require('./Entity')
const { asyncEach } = require('./util')

// Should this be renamed? It's not so much a map like the others, but it
// renders the same way..

module.exports = class Entitymap {
  constructor(levelmap, entityData = []) {
    this.game = levelmap.game
    this.levelmap = levelmap
    this.entities = []

    // A fancy structure containing data about the default position for
    // entities.
    this.entityData = []
    this.loadEntityData(entityData)

    this.tileSize = 16
  }

  loadEntityData(newEntityData) {
    // Loads entity data. A new structure can be passed; otherwise it just 
    // loads the old one.

    if (newEntityData) {
      this.entityData = newEntityData
    }

    return asyncEach(this.entityData, data => {
      if (data.typePath) {
        const { typePath, x, y } = data

        const inst = new Entity(this.levelmap)
        inst.x = x
        inst.y = y

        return this.game.readPackageFile(typePath).then(str => {
          const entityType = JSON.parse(str)
          if (entityType.scriptPath) {
            return this.game.readPackageFile(entityType.scriptPath)
              .then(code => {
                const { customLanguage } = this.game
                return customLanguage.getHooks(code.toString(), {
                  '_get-self': () => inst
                })
              }).then(hooks => {
                inst.hooks = hooks
                return inst
              })
          } else {
            inst.hooks = {}
            return inst
          }
        })
      } else {
        console.warn(
          'Entity data entry doesn\'t have a type path attached?', data
        )

        return null
      }
    }).then(arr => arr.filter(Boolean))
      .then(entities => {
        this.entities = entities
      })
  }

  drawTo(canvasTarget) {
    const { scrollX, scrollY, tileSize } = this.levelmap

    const ctx = canvasTarget.getContext('2d')

    for (let entity of this.entities) {
      ctx.fillStyle = 'red'
      ctx.fillRect(
        Math.floor((entity.x - scrollX) * tileSize),
        Math.floor((entity.y - scrollY) * tileSize),
        16, 16
      )
    }
  }

  tick() {
    return asyncEach(this.entities, entity => {
      entity.tick()

      if (entity.hooks.ticked) {
        return entity.hooks.ticked()
      }
    })
  }

  createEntityDataEntry() {
    return {
      typePath: null,
      x: 0,
      y: 0
    }
  }
}
