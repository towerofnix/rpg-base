game = import('game.ss')

self = _get-self()

direction-prop = ''
direction-multiplier = 0

is-integer(n) {
  return _call-js-func([_get-js-global('Number') isInteger] n)
}

spawned() {
  -- Called when the entity is spawned into a level.

  direction-prop => ''
  direction-multiplier => '0'

  call([game register-entity-as-hero] self)

  -- If we came in through a door, we'll want to teleport to where the door was
  -- targeted to spawn us..

  gameObj = _get-game()
  activeDoor = [gameObj activeDoor]

  if activeDoor {
    spawn = [activeDoor spawnPos]
    call([game warp-entity] self [spawn 0] [spawn 1])
    call([game warp-entity-to-layer] self [spawn 2])
  }

  -- Otherwise, we'll just spawn at the default spawn position of the level.

  if not(activeDoor) {
    spawn = [[gameObj levelmap] defaultSpawnPos]
    call([game warp-entity] self [spawn 0] [spawn 1])
    call([game warp-entity-to-layer] self [spawn 2])
  }
}

ticked() {
  -- Called when the entity is ticked, usually once every render frame.

  if equal(direction-prop '') {
    movement = call([game get-entity-allowed-movement] self)

    if and([movement right] call([game key-pressed] 39)) {
      direction-prop => 'x'
      direction-multiplier => 1
    }

    if and([movement up] call([game key-pressed] 38)) {
      direction-prop => 'y'
      direction-multiplier => -1
    }

    if and([movement down] call([game key-pressed] 40)) {
      direction-prop => 'y'
      direction-multiplier => 1
    }

    if and([movement left] call([game key-pressed] 37)) {
      direction-prop => 'x'
      direction-multiplier => -1
    }
  }

  if not(equal(direction-prop '')) {
    increase(self direction-prop *(0.1 direction-multiplier))
    call([game fix-entity-position] self)

    if and(is-integer([self x]) is-integer([self y])) {
      direction-prop => ''
      direction-multiplier => 0
    }
  }

  if and([self moved] and(is-integer([self x]) is-integer([self y]))) {
    doormap = [[self layer] doormap]
    door = _call-js-func([doormap getItemAt] [self x] [self y] :: this=doormap)

    if door {
      door-data = call([game get-prop] [[self levelmap] doors] -(door 1))

      _call-js-func([self emit] 'steppedOnDoor' door-data :: this=self)
    }
  }
}
