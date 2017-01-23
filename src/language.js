// A language. Implemented in Syn for the cool level.
// Actually it only exists for the cool level.
// Call it Scriptscript since you use it to script scripts.

const EventEmitter = require('events')
const { makeParser } = require('../lib/syn/Syn')

const isWhitespace = char => (char === ' ' || char === '\n')

const parser = makeParser({
  rootSyn: 'ProgramDefinition',
  syns: {
    Whitespace(syn) {
      while (syn.code[syn.i] && isWhitespace(syn.code[syn.i])) {
        syn.i++
      }
    },

    Identifier(syn) {
      const isValid = char => (
        char && !(isWhitespace(char) || [
          '(', ')', '{', '}', '[', ']', '\'', '"', '='
        ].includes(char)))

      while (syn.code[syn.i] && isValid(syn.code[syn.i])) {
        syn.i++
      }

      if (syn.startI === syn.i) {
        throw syn.failed('Identifier is blank')
      }

      syn.data.string = syn.code.slice(syn.startI, syn.i)
    },

    NumberLiteral(syn) {
      let hasDecimal = false
      let hasDigits = false

      while (syn.code[syn.i]) {
        if (syn.code[syn.i] === '.') {
          if (hasDecimal) {
            throw new Error('Multiple decimal marks in number')
          } else {
            hasDecimal = true
          }
        }

        if (syn.code[syn.i] === '-') {
          if (syn.i !== syn.startI) {
            break
          }
        }

        if (!('1234567890-.'.split('').includes(syn.code[syn.i]))) {
          break
        } else {
          hasDigits = true
        }

        syn.i++
      }

      if (!hasDigits) {
        throw syn.failed('Number literal has no digits')
      }

      syn.data.number = parseFloat(syn.code.slice(syn.startI, syn.i))
    },

    StringLiteral(syn) {
      syn.parsePastString('\'')

      while (syn.code[syn.i] && syn.code[syn.i] !== '\'') {
        syn.i++
      }

      syn.parsePastString('\'')

      syn.data.string = syn.code.slice(syn.startI + 1, syn.i - 1)
    },

    Expression(syn) {
      // An expression. Currently only supports Identifiers.

      syn.data.expression = syn.tryToParsePast(
        'FunctionCall', 'StringLiteral', 'NumberLiteral', 'Identifier'
      )
    },

    FunctionCall(syn) {
      // A function call. It follows this syntax:
      //
      // Identifier '(' Expression.. [ '::' (Identifier = Expression).. ] ')'
      //
      // Normal usage: foo(a b c)
      // Keyword arg usage: foo(a b :: x=4 y=8)

      syn.data.name = syn.parsePast('Identifier').data.string
      syn.data.arguments = []
      syn.data.keywordArgs = {}

      syn.parsePast('Whitespace')
      syn.parsePastString('(')
      syn.parsePast('Whitespace')

      while (syn.code[syn.i] && syn.code[syn.i] !== ')') {
        const arg = syn.parsePast('Expression').data.expression
        syn.data.arguments.push(arg)

        syn.parsePast('Whitespace')

        if (syn.code.slice(syn.i, syn.i + 2) === '::') {
          syn.parsePastString('::')
          syn.parsePast('Whitespace')

          while (syn.code[syn.i] && syn.code[syn.i] !== ')') {
            const key = syn.parsePast('Identifier').data.string

            syn.parsePast('Whitespace')
            syn.parsePastString('=')
            syn.parsePast('Whitespace')

            const value = syn.parsePast('Expression').data.expression

            syn.data.keywordArgs[key] = value

            syn.parsePast('Whitespace')
          }

          break
        }
      }

      syn.parsePastString(')')
    },

    VariableSet(syn) {
      // A variable set. It follows this syntax:
      //
      // Identifier = Expression

      syn.data.name = syn.parsePast('Identifier').data.string

      syn.parsePast('Whitespace')
      syn.parsePastString('=')
      syn.parsePast('Whitespace')

      syn.data.expression = syn.parsePast('Expression').data.expression
    },

    ReturnStatement(syn) {
      // A return statement. It follows this syntax:
      //
      // 'return' Expression

      syn.parsePastString('return')
      syn.parsePast('Whitespace')

      syn.data.expression = syn.parsePast('Expression').data.expression
    },

    LineComment(syn) {
      // A line comment. It follows this syntax:
      //
      // -- (comment)
      //
      // The comment continues until the end of the line.

      syn.parsePastString('--')

      while (syn.code[syn.i] && syn.code[syn.i] !== '\n') {
        syn.i++
      }
    },

    Statement(syn) {
      // A statement.

      syn.data.statement = syn.tryToParsePast(
        'VariableSet', 'FunctionCall', 'ReturnStatement', 'LineComment'
      )
    },

    ProcedureDefinition(syn) {
      // A procedure definition. It follows this syntax:
      //
      // Identifier '(' Identifier.. ')'
      //  '{' Statement.. '}'

      syn.data.name = syn.parsePast('Identifier').data.string
      syn.data.parameters = []
      syn.data.statements = []

      syn.parsePast('Whitespace')
      syn.parsePastString('(')
      syn.parsePast('Whitespace')

      while (syn.code[syn.i] && syn.code[syn.i] !== ')') {
        const param = syn.parsePast('Identifier')
        syn.data.parameters.push(param.data.string)

        syn.parsePast('Whitespace')
      }

      syn.parsePastString(')')
      syn.parsePast('Whitespace')
      syn.parsePastString('{')
      syn.parsePast('Whitespace')

      while (syn.code[syn.i] && syn.code[syn.i] !== '}') {
        const statement = syn.parsePast('Statement').data.statement
        syn.data.statements.push(statement)

        syn.parsePast('Whitespace')
      }

      syn.parsePastString('}')
    },

    ProgramDefinition(syn) {
      // A program definition. It's made up of procedure definitions.

      syn.data.procedureDefs = []

      syn.parsePast('Whitespace')

      while (syn.code[syn.i]) {
        const procDef = syn.parsePast('ProcedureDefinition')
        syn.data.procedureDefs.push(procDef)

        syn.parsePast('Whitespace')
      }
    }
  }
})

const LString = class LString {
  constructor(str) {
    this.str = String(str)
  }

  toString() {
    return this.str
  }
}

const LNumber = class LNumber {
  constructor(num) {
    this.num = Number(num)
  }

  toString() {
    return this.num.toString()
  }

  valueOf() {
    return this.num
  }
}

const LEnvironment = class LEnvironment extends EventEmitter {
  constructor() {
    super()

    this.vars = {}

    this.returnValue = null
  }

  returnVal(value) {
    this.emit('returned', value)
  }
}

const asyncEach = function(arr, fn) {
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

const interpret = function(program, { customBuiltins = {}} = {}) {
  const vars = {}

  const hooks = {}
  const builtins = Object.assign({
    'js-console-log': (opts, lstr) => {
      console.log(lstr.toString())
    },

    'concat': (opts, ...lstrs) => {
      return new LString(lstrs.map(s => s.toString()).reduce((a, b) => a + b))
    },

    'var-set': (opts, name, value) => {
      vars[name] = value
    },

    'var-get': (opts, name) => {
      return vars[name]
    },

    'waitms': (opts, ms) => {
      return new Promise(res => {
        setTimeout(() => res(), ms)
      })
    }
  }, customBuiltins)

  const evaluateExpression = function(expression, env) {
    if (expression.type === 'Identifier') {
      const name = expression.data.string
      if (env.vars.hasOwnProperty(name)) {
        return env.vars[name]
      } else {
        throw new Error(`No variable exists by name ${name}`)
      }
    }

    if (expression.type === 'StringLiteral') {
      return new LString(expression.data.string)
    }

    if (expression.type === 'NumberLiteral') {
      return new LNumber(expression.data.number)
    }

    if (expression.type === 'FunctionCall') {
      const name = expression.data.name
      const args = expression.data.arguments
      const keywordArgs = expression.data.keywordArgs
      const kwargEntries = Object.keys(keywordArgs).map(
        k => [k, keywordArgs[k]])

      let evaluatedArgs
      const evaluatedKeywordArgs = {}

      return asyncEach(args, e => evaluateExpression(e, env))
        .then(a => evaluatedArgs = a)
        .then(() => asyncEach(kwargEntries, ([ key, value ]) => {
          return Promise.resolve(evaluateExpression(value, env)).then(v => {
            evaluatedKeywordArgs[key] = v
          })
        }))
        .then(() => {
          if (hooks.hasOwnProperty(name)) {
            return hooks[name](evaluatedKeywordArgs, ...evaluatedArgs)
          } else if (builtins.hasOwnProperty(name)) {
            return builtins[name](evaluatedKeywordArgs, ...evaluatedArgs)
          } else {
            throw new Error(`No function or procedure exists by name ${name}`)
          }
        })
    }
  }

  const evaluateStatement = function(statement, env) {
    if (statement.type === 'VariableSet') {
      return Promise.resolve(
        evaluateExpression(statement.data.expression, env)
      ).then(value => {
        env.vars[statement.data.name] = value
      })
    }

    if (statement.type === 'ReturnStatement') {
      return Promise.resolve(
        evaluateExpression(statement.data.expression, env)
      ).then(value => {
        env.returnVal(value)
      })
    }

    return evaluateExpression(statement, env)
  }

  for (let procDef of program.data.procedureDefs) {
    hooks[procDef.data.name] = (obj = {}, args = [], parentEnv = null) => {
      const env = new LEnvironment()
      env.parentEnv = parentEnv

      let cancel = null
      let returnValue

      env.on('returned', value => {
        if (cancel) {
          cancel()
          returnValue = value
        }
      })

      if (Object.keys(obj).length) {
        console.warn(
          'Keyword arguments cannot be passed to user procedures yet!' +
          `(From ${procDef.data.name} call)`
        )
      }

      const params = procDef.data.parameters
      for (let i = 0; i < args.length && i < params.length; i++) {
        env.vars[params[i]] = args[i]
      }

      return asyncEach(procDef.data.statements, (statement, _cancel) => {
        cancel = _cancel

        return evaluateStatement(statement, env)
      }).then(() => {
        cancel = null
        return returnValue
      })
    }
  }

  return hooks
}

module.exports = function(code, opts) {
  const program = parser(code)

  return interpret(program, opts)
}
