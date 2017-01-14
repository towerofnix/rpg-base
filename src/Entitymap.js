class Entitymap {
  constructor(levelmap, entityData = []) {
    this.levelmap = levelmap
    this.entities = []

    // A fancy structure containing data about the default position for
    // entities.
    this.loadEntityData(entityData)

    this.tileSize = 16
  }

  loadEntityData(newEntityData) {
    // Loads entity data. A new structure can be passed; otherwise it just 
    // loads the old one.

    if (newEntityData) {
      this.entityData = newEntityData
    }

    this.entities = this.entityData.map(data => {
      const [ cls, x, y ] = data

      const inst = new cls(this.levelmap)
      inst.x = x
      inst.y = y

      return inst
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
    for (let entity of this.entities) {
      entity.tick()
    }
  }
}