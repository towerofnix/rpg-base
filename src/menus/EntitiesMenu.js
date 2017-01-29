const Menu = require('../Menu')

module.exports = class EntitiesMenu extends Menu {
  constructor(game, entitymap) {
    super(game, [{}])

    this.entitymap = entitymap

    this.newEntityData = entitymap.entityData.slice(0)

    this.setupItems()
  }

  setupItems() {
    this.items.splice(0)

    if (this.newEntityData.length) {
      for (let i = 0; i < this.newEntityData.length; i++) {
        const entityData = this.newEntityData[i]

        const label = (
          `Entity ${i}` + (entityData.typePath ? '' : ' (No type file!)')
        )

        this.items.push({
          label: label,
          action: () => this.editEntity(entityData),
          keyAction: key => {
            if (key === 189) { // -
              this.newEntityData.splice(i, 1)
              this.setupItems()
            }
          }
        })
      }

      this.items.push({label: '------------------', selectable: false})
    }

    this.items.push({
      label: 'Add Entity', action: () => this.addEntity()
    })

    this.items.push({label: 'Confirm', action: () => {
      this.entitymap.loadEntityData(this.newEntityData)
      this.emit('closed')
    }})

    this.items.push({label: 'Cancel', action: () => {
      this.emit('closed')
    }})
  }

  editEntity(entity) {
    const typeItem = {
      get label() {
        return entity.typePath || '(None set)'
      },

      action: () => {
        const packagePath = this.game.pickFile({
          title: 'Pick Entity Type File',
          filters: [
            {name: 'Entity Files', extensions: ['json']}
          ]
        })

        if (packagePath) {
          entity.typePath = packagePath
        }
      }
    }

    const i = this.newEntityData.indexOf(entity)

    const menu = new Menu(this.game, [
      {label: `Entity ${i}\n`, selectable: false},

      {label: 'Type path:', selectable: false},
      typeItem,
      {label: '', selectable: false},

      {label: 'Back', action: () => closeMenu()}
    ])

    const closeMenu = this.game.setDialog(menu)
  }

  addEntity() {
    this.newEntityData.push(this.entitymap.createEntityDataEntry())
    this.setupItems()
  }
}
