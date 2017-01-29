module.exports.splitIndexToPos = function(i, w, s = 1) {
  // Takes three arguments:
  //
  // (i) The index to split.
  // (w) The width of the image/level you'd split this from.
  // (s) The size of each tile in the image/level you'd split this from.
  //     Default 1.

  const x = (i * s) % w
  const y = Math.floor(i * s / w) * s

  return [x, y]
}

module.exports.joinPosToIndex = function([x, y], w, s = 1) {
  // Takes three arguments:
  //
  // (x/y) The X and Y of the split index/position. An array.
  // (w) The width of the image/level you'd have split it from.
  // (s) The size of each tile in the image/level you'd have split it from.

  const i = ((y / s) * w + x) / s

  return i
}

module.exports.filterOne = function(arr, fn) {
  // Like normal array filter, except it only returns the first match. Returns
  // null if no items match.

  for (let item of arr) {
    if (fn(item)) {
      return item
    }
  }

  return null
}

module.exports.asyncEach = function(arr, fn) {
  // Asyncrhonously loops through each item of an array and applies a function
  // to it. Loops in order of index, and doesn't run more the function on more
  // than one item at a time.

  const res = []

  const helper = function(i) {
    let shouldCancel = false

    const cancel = function() {
      shouldCancel = true
    }

    return Promise.resolve(fn(arr[i], cancel)).then(x => {
      if (shouldCancel) {
        return
      }

      res.push(x)

      if (i < arr.length - 1) {
        return helper(i + 1)
      } else {
        return res
      }
    })
  }

  return (arr.length === 0 ? Promise.resolve([]) : helper(0))
}

module.exports.makeKeyAction = function(keyListener, combo, action) {
  // Makes a key action. Run the return function every tick. If the key combo
  // you passed has just been completed, it'll run the action you passed.
  //
  // Probably put the result of calling this in an array on your object, then
  // run it every tick.

  let pressed = false

  return function tick() {
    if (combo.map(x => keyListener.isPressed(x)).every(x => x === true)) {
      if (!pressed) {
        action()
      }

      pressed = true
    } else {
      pressed = false
    }
  }
}
