const TalkDialog = require('./TalkDialog')

const getHooks = require('./language')

module.exports = class CustomLanguage {
  constructor(game) {
    this.game = game
  }

  getHooks(code, builtins = {}) {
    return getHooks(code, {
      globalData: {
        importPath: this.game.packagePath,
        customBuiltins: Object.assign({
          '_get-game': () => this.game,

          '_call-js-func': (kwargs = {}, [ fn, ...args ]) => {
            if (kwargs.this) {
              return fn.apply(kwargs.this, args)
            } else {
              return fn.apply(null, args)
            }
          },

          '_get-js-global': (kwargs, [ key ]) => {
            return global[key]
          },

          '_jsify-proc': (kwargs, [ proc ]) => {
            // Creates a function that will pass ordered arguments over to the
            // passed procedure (scriptscript function).

            return function(...args) {
              return proc({}, args)
            }
          },

          '+': (kwargs, [ ...args ]) => args.reduce((a, b) => a + b),
          '-': (kwargs, [ ...args ]) => args.reduce((a, b) => a - b),
          '*': (kwargs, [ ...args ]) => args.reduce((a, b) => a * b),
          '/': (kwargs, [ ...args ]) => args.reduce((a, b) => a / b),
          'gt': (kwargs, [ a, b ]) => (a > b),
          'lt': (kwargs, [ a, b ]) => (a < b),
          'equal': (kwargs, [ a, b ]) => (a === b), // todo: 3+ args
          'and': (kwargs, [ a, b ]) => (a && b), // todo: 3+ args
          'or': (kwargs, [ a, b ]) => (a || b), // todo: 3+ args
          'not': (kwargs, [ x ]) => !x,

          'increase': (kwargs, [ obj, key, val ]) => { obj[key] += val },
          'decrease': (kwargs, [ obj, key, val ]) => { obj[key] -= val }
        }, builtins)
      }
    })
  }
}
