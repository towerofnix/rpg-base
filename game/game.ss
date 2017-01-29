
-- Global vars, requires/imports ----------------------------------------------

_require = _get-js-global('require')
_TalkDialog = _call-js-func(_require './src/TalkDialog')

_Reflect = _get-js-global('Reflect')
_Array = _get-js-global('Array')
_Object = _get-js-global('Object')

-- Utilities (Internal) -------------------------------------------------------

set-prop(obj key val) {
  _call-js-func([_Reflect set] obj key val)
}

get-prop(obj key) {
  return _call-js-func([_Reflect get] obj key)
}

-- Game Utilities -------------------------------------------------------------

log(x) {
  -- Logs text to the browser console.

  console = _get-js-global('console')
  _call-js-func([console log] x :: this=console)
}

reveal-path(path) {
  -- Reveals a path in Finder. Only works on macOS.

  game = _get-game()
  _call-js-func([game revealPath] path :: this=game)
}

text-dialog(text) {
  -- Displays a text dialog containing the given text.

  game = _get-game()

  _config = _call-js-func(_Object)
  set-prop(_config 'msg' text)

  _call-js-func([_TalkDialog prompt] game _config)
}

key-pressed(key-code) {
  key-listener = [_get-game() keyListener]

  return _call-js-func([key-listener isPressed] key-code :: this=key-listener)
}

-- Entity Utilities -----------------------------------------------------------

move-entity(entity add-x add-y) {
  -- Moves a given entity by an amount.

  new-x = +(add-x [entity x])
  new-y = +(add-y [entity y])

  set-prop(entity 'x' new-x)
  set-prop(entity 'y' new-y)

  fix-entity-position(entity)
}

warp-entity(entity new-x new-y) {
  -- Teleports an entity to a new position.

  set-prop(entity 'x' new-x)
  set-prop(entity 'y' new-y)

  fix-entity-position(entity)
}

warp-entity-to-layer(entity n) {
  -- Teleoprts an entity to a specific layer.

  levelmap = [entity levelmap]
  layers = [levelmap layers]

  -- Remove the entity from its current layer's entitymap..

  foreach-fn(layer) {
    entitymap = [layer entitymap]
    entities-arr = [entitymap entities]

    index = _call-js-func([entities-arr indexOf] entity :: this=entities-arr)

    if not(lt(index 0)) {
      _call-js-func([entities-arr splice] index 1 :: this=entities-arr)
    }
  }

  _call-js-func([layers forEach] _jsify-proc(foreach-fn) :: this=layers)

  -- Then push it to the target entitymap.

  target-entities-arr = [[get-prop(layers n) entitymap] entities]
  _call-js-func([target-entities-arr push] entity :: this=target-entities-arr)
}

get-entity-allowed-movement(entity) {
  return _call-js-func([entity getAllowedMovement] :: this=entity)
}

fix-entity-position(entity) {
  -- Fixes an entity's position. For some reason JavaScript is very bad at math
  -- and likes to pretend that 0.1 + 0.2 is 0.30000000000000004, which causes
  -- all kinds of trouble when comparing values. This function just changes the
  -- entity's position so that if you move it from 0.1 by 0.2, its position
  -- will be 0.3, not a messed up decimal.
  --
  -- It's automatically called by move-entity (and warp-entity) so you usually
  -- don't need to call this yourself.

  _call-js-func([entity fixPosition] :: this=entity)
}

register-entity-as-hero(entity) {
  -- Makes the entity known as the hero entity, as far as the game is
  -- concerned. That means that the game's view will follow that entity, the
  -- entity will be able to do things when it steps on doors, etc.

  game = _get-game()

  _call-js-func([game setupHeroEntity] entity :: this=game)
}
