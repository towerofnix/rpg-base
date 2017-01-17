const Menu = require('../Menu')

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

    const menu = new Menu(this.levelmap.game, [
      {label: `Door ${this.newDoors.indexOf(door) + 1}`, selectable: false},
      pathItem,
      {label: '', selectable: false},
      {label: 'Choose Path..', action: () => {
        const openSelection = dialog.showOpenDialog({
          title: 'Open file',
          defaultPath: this.levelmap.game.packagePath,
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

        const { valid, packagePath } = this.processPath(newPath)

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
      {label: 'Back', action: () => this.emit('dialogRequested', this)}
    ])

    this.emit('dialogRequested', menu)
  }

  processPath(p) {
    if (p.startsWith(this.game.packagePath)) {
      return {
        valid: true,
        packagePath: path.relative(this.game.packagePath, p)
      }
    } else {
      return {valid: false}
    }
  }
}
