const Menu = require('../Menu')
const Levelmap = require('../Levelmap')

const path = require('path')
const { filterOne } = require('../util')
const { dialog } = require('electron').remote

module.exports = class DoorMenu extends Menu {
  // TODO: Removing a door should remove all of its references in the doormap,
  // and it should also change references to other door tiles to make sure
  // they're all still referencing their old door^. This should all be done
  // when the dialog is confirmed since if there's tons of doors it might take
  // a while to update.
  //
  // ^ i.e. (n > removed ? n - 1 : n)

  constructor(levelmap) {
    super(levelmap.game, [{}])

    this.levelmap = levelmap

    this.newDoors = levelmap.doors.slice(0)

    this.setupItems()
  }

  setupItems() {
    this.items.splice(0)

    if (this.newDoors.length) {
      for (let i = 0; i < this.newDoors.length; i++) {
        const door = this.newDoors[i]

        const oldI = this.levelmap.doors.indexOf(door)

        this.items.push({
          label: `Door ${i + 1} (Old: ${oldI >= 0 ? oldI + 1 : -1})`,
          keyAction: (key) => {
            if (key === 189) { // -
              this.newDoors.splice(i, 1)
              this.setupItems()
            }
          },
          action: () => {
            this.doorMenu(door)
          }
        })
      }

      this.items.push({label: '------------------', selectable: false})
    }

    this.items.push({
      label: 'Add Door', action: () => this.addDoor(),
      selectable: (this.newDoors.length < 9)
    })

    this.items.push({label: 'Confirm', action: () => {
      this.levelmap.doors = this.newDoors
      this.emit('confirmed')
    }})

    this.items.push({label: 'Cancel', action: () => {
      this.emit('canceled')
    }})
  }

  addDoor() {
    if (this.newDoors.length >= 9) {
      return
    }

    this.newDoors.push(this.levelmap.createDoor())
    this.setupItems()
    this.selectedIndex = this.items.indexOf(filterOne(
      this.items, item => item.label.startsWith('Door ' + this.newDoors.length)
    ))
  }

  doorMenu(door) {
    const pathItem = {
      label: door.to === null ? 'No path assigned' : door.to,
      selectable: false
    }

    const spawnPosItem = {
      get label() {
        return (
          `Spawn: ${door.spawnPos[0]}, ${door.spawnPos[1]}` +
          ` on layer ${door.spawnPos[2] || -1}`
        )
      },
      selectable: false
    }

    const menu = new Menu(this.game, [
      {label: `Door ${this.newDoors.indexOf(door) + 1}`, selectable: false},
      pathItem,
      spawnPosItem,
      {label: '', selectable: false},
      {label: 'Choose Path..', action: () => {
        const openSelection = dialog.showOpenDialog({
          title: 'Choose Path',
          defaultPath: this.game.packagePath,
          properties: ['openFile'],
          filters: [
            {name: 'Level Files', extensions: ['json']}
          ]
        })

        if (typeof openSelection === 'undefined') {
          // Canceled, no file picked
          return
        }

        const newPath = openSelection[0]

        const { valid, packagePath } = this.game.processPath(newPath)

        if (valid) {
          door.to = packagePath
          pathItem.label = packagePath
        } else {
          console.error(
            'Invalid door path: ' + newPath +
            '\nMaybe it isn\'t in the game package folder?'
          )
        }
      }},
      {label: 'Choose Spawn..', action: () => {
        if (!door.to) {
          return
        }

        const { game } = this.levelmap

        const reopenMenu = game.setDialog(null)

        game.loadLevelmapFromFile(door.to, {transition: false}).then(() => {
          game.levelmap.editorMode = Levelmap.EDITOR_MODE_PICK_WORLD_TILE
          return game.levelmap.pickTile()
        }).then(evt => {
          // We only want to change the spawn position of the user actually
          // picked a tile.
          if (evt) {
            door.spawnPos = [evt.x, evt.y, evt.layer]
          }

          game.loadLevelmap(this.levelmap)
          reopenMenu()
        })
      }},
      {label: 'Back', action: () => closeMenu()}
    ])

    const closeMenu = this.game.setDialog(menu)
  }
}
