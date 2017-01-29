const Menu = require('../Menu')
const EntitiesMenu = require('./EntitiesMenu')

module.exports = class LayerMenu extends Menu {
  constructor(levelmap) {
    super(levelmap.game, [{}])

    this.newLayers = levelmap.layers.slice(0)

    this.levelmap = levelmap

    this.setupItems()
  }

  setupItems() {
    this.items.splice(0)

    for (let i = 0; i < this.newLayers.length; i++) {
      const layer = this.newLayers[i]

      const label = (
        `Layer ${i} (Old: ${this.levelmap.layers.indexOf(layer)})` +
        (layer.visibleInEditor ? '' : ' (Invis.)')
      )

      this.items.push({
        label: label,
        action: () => {
          this.selectedIndex += 3 // to 'edit layer data'
          this.constraints()
        },
        keyAction: (key) => {
          // Moving layers use the same keys as going up/down layers in
          // the main level editor.
          if (key === 221) { // ]
            this.moveUpLayer(i)
          } else if (key === 219) { // [
            this.moveDownLayer(i)
          } else if (key === 189) { // -
            this.deleteLayer(i)
          } else if (key === 187) { // +
            this.addLayerAbove(i)
          } else if (key === 86) { // V
            this.toggleEditorVisibility(i)
          }
        }
      })
      this.items.push({label: '  Move Down', action: () => {
        this.moveDownLayer(i)
      }})
      this.items.push({label: '  Move Up', action: () => {
        this.moveUpLayer(i)
      }})
      this.items.push({label: '  Edit Layer Data..', action: () => {
        this.editLayerData(layer)
      }})
    }

    this.items.push({label: '------------------', selectable: false})

    this.items.push({label: 'Confirm', action: () => {
      this.levelmap.layers = this.newLayers
      this.emit('confirmed')
    }})

    this.items.push({label: 'Cancel', action: () => {
      this.emit('canceled')
    }})
  }

  moveDownLayer(i) {
    // We can't move the bottom layer down..
    if (i === 0) return

    const layer = this.newLayers.splice(i, 1)[0]
    this.newLayers.splice(i - 1, 0, layer)

    this.setupItems()
    this.selectedIndex -= 3
  }

  moveUpLayer(i) {
    // We can't move the top layer up..
    if (i === this.newLayers.length - 1) return

    const layer = this.newLayers.splice(i, 1)[0]
    this.newLayers.splice(i + 1, 0, layer)

    this.setupItems()
    this.selectedIndex += 3
  }

  deleteLayer(i) {
    // We can't delete *all* the layers..
    if (this.newLayers.length === 1) return

    this.newLayers.splice(i, 1)

    this.setupItems()
  }

  addLayerAbove(i) {
    // Above as in *in the menu*, not *in the world*. Weird, right?

    this.newLayers.splice(i, 0, this.levelmap.createLayer())

    // Since we're pushing everything down we don't need to move the
    // cursor.
    this.setupItems()
  }

  toggleEditorVisibility(i) {
    const layer = this.newLayers[i]
    layer.visibleInEditor = !layer.visibleInEditor

    this.setupItems()
  }

  editLayerData(layer) {
    const menu = new Menu(this.game, [
      {label: `Layer ${this.newLayers.indexOf(layer)}\n`, selectable: false},
      {label: 'Edit Entities..', action: () => {
        this.editEntitiesOfLayer(layer)
      }},
      {label: 'Back', action: () => closeMenu()}
    ])

    menu.on('canceled', () => closeMenu())

    const closeMenu = this.game.setDialog(menu)
  }

  editEntitiesOfLayer(layer) {
    const menu = new EntitiesMenu(this.game, layer.entitymap)

    menu.on('canceled', () => closeMenu())
    menu.on('closed', () => closeMenu())

    const closeMenu = this.game.setDialog(menu)
  }
}
