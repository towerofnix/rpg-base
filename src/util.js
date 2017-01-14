const splitIndexToPos = function(i, w, h, s = 1) {
  // Takes four arguments:
  //
  // (i) The index to split.
  // (w) The width of the image/level you'd split this from.
  // (h) The height of the image/level you'd split this from.
  // (s) The size of each tile in the image/level you'd split this from.
  //     Default 1.

  const x = (i * s) % w
  const y = Math.floor(i * s / w) * s

  return [x, y]
}

const joinPosToIndex = function([x, y], w, s = 1) {
  // Takes three arguments:
  //
  // (x/y) The X and Y of the split index/position. An array.
  // (w) The width of the image/level you'd have split it from.
  // (s) The size of each tile in the image/level you'd have split it from.

  const i = ((y / s) * w + x) / s

  return i
}

const filterOne = function(arr, fn) {
  // Like normal array filter, except it only returns the first match. Returns
  // null if no items match.

  for (let item of arr) {
    if (fn(item)) {
      return item
    }
  }

  return null
}
