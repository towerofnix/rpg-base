// A language. Implemented in Syn for the cool level.
// Actually it only exists for the cool level.
// Call it Scriptscript since you use it to script scripts.

const { asyncEach } = require('./util')

const EventEmitter = require('events')
const fsp = require('fs-promise')
const { makeParser } = require('../lib/syn/syn')

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
          '(', ')', '{', '}', '[', ']', '\'', '"', '=', '.', '>', '<'
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

      let str = ''

      while (syn.code[syn.i] && syn.code[syn.i] !== '\'') {
        if (syn.code[syn.i] === '\\') {
          if (syn.code[syn.i + 1] === '\'') {
            str += '\''
            syn.i += 2
            continue
          } else {
            str += '\\'
          }
        } else {
          str += syn.code[syn.i]
        }

        syn.i++
      }

      syn.parsePastString('\'')

      syn.data.string = str
    },

    PropertyGet(syn) {
      // A property get. It follows this syntax:
      //
      // '[' Expression Identifier ']'

      syn.parsePastString('[')
      syn.data.expression = syn.parsePast('Expression').data.expression
      syn.parsePast('Whitespace')
      syn.data.key = syn.parsePast('Identifier').data.string
      syn.parsePast('Whitespace')
      syn.parsePastString(']')
    },

    Expression(syn) {
      // An expression. Currently only supports Identifiers.

      syn.data.expression = syn.tryToParsePast(
        'FunctionCall', 'StringLiteral', 'NumberLiteral', 'PropertyGet',
        'Identifier'
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

    VariableChange(syn) {
      // A variable change. It follows this syntax:
      //
      // Identifier => Expression

      syn.data.name = syn.parsePast('Identifier').data.string
      syn.parsePast('Whitespace')
      syn.parsePastString('=>')
      syn.parsePast('Whitespace')

      syn.data.expression = syn.parsePast('Expression').data.expression
    },

    CodeBlock(syn) {
      // A code block. It follows this syntax:
      //
      // '{' Statement.. '}'

      syn.data.statements = []

      syn.parsePastString('{')
      syn.parsePast('Whitespace')

      while (syn.code[syn.i] && syn.code[syn.i] !== '}') {
        const statement = syn.parsePast('Statement').data.statement
        syn.data.statements.push(statement)

        syn.parsePast('Whitespace')
      }

      syn.parsePastString('}')
    },

    IfStatement(syn) {
      // An if statement. It follows this syntax:
      //
      // 'if' Expression '{' Statement.. '}'

      syn.parsePastString('if')
      syn.parsePast('Whitespace')
      syn.data.test = syn.parsePast('Expression').data.expression
      syn.parsePast('Whitespace')
      syn.data.statements = syn.parsePast('CodeBlock').data.statements
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
        'LineComment', 'ProcedureDefinition', 'VariableSet', 'VariableChange',
        'FunctionCall', 'IfStatement', 'ReturnStatement'
      )
    },

    ProcedureDefinition(syn) {
      // A procedure definition. It follows this syntax:
      //
      // Identifier '(' Identifier.. ')' CodeBlock

      syn.data.name = syn.parsePast('Identifier').data.string
      syn.data.parameters = []

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

      syn.data.statements = syn.parsePast('CodeBlock').data.statements
    },

    ProgramDefinition(syn) {
      // A program definition. It's made up of procedure definitions and
      // statements.

      syn.data.statements = []

      syn.parsePast('Whitespace')

      while (syn.code[syn.i]) {
        const statement = syn.parsePast('Statement')
        syn.data.statements.push(statement.data.statement)

        syn.parsePast('Whitespace')
      }
    }
  }
})

const LEnvironment = class LEnvironment extends EventEmitter {
  constructor() {
    super()

    this.vars = {}

    // This is a (less) magical hidden internal global variable object. It
    // stores data that can be accessed from ALL (child) language calls -
    // things like the global import path.
    this.globalData = {}
  }

  returnVal(value) {
    this.emit('returned', value)
  }
}

const LVariable = class LVariable {
  constructor(val) {
    this.value = val
  }
}

const interpret = function(program, { globalData = {} } = {}) {
  const {
    customBuiltins = {}
  } = globalData

  const builtins = Object.assign({
    'import': (kwargs, [ path ], { globalData }) => {
      const { importPath = '' } = globalData

      return fsp.readFile(importPath + path).then((code) => {

        // We want imported code to have the same globalData as this code, so
        // we'll set that on the env..
        return getHooks(code.toString(), {globalData})
      })
    },

    'waitms': (kwargs, [ ms ]) => {
      return new Promise(res => {
        setTimeout(() => res(), ms)
      })
    },

    'call': (kwargs, [ fn, ...args ], { globalData }) => {
      if (!(fn instanceof Function)) {
        throw new Error(`Scriptscript \`call\` called with non-function ${fn}`)
      }

      return fn(kwargs, args, {globalData})
    }
  }, customBuiltins)

  const evaluateExpression = function(expression, env) {
    if (expression.type === 'Identifier') {
      const name = expression.data.string
      if (env.vars.hasOwnProperty(name)) {
        return env.vars[name].value
      } else {
        throw new Error(`No variable exists by name ${name}`)
      }
    }

    if (expression.type === 'StringLiteral') {
      return expression.data.string
    }

    if (expression.type === 'NumberLiteral') {
      return expression.data.number
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
          if (env.vars.hasOwnProperty(name)) {
            const hook = env.vars[name].value
            if (hook instanceof Function) {
              return hook(evaluatedKeywordArgs, evaluatedArgs, env)
            } else {
              throw new Error(`Variable ${name} is not a function`)
            }
          } else if (builtins.hasOwnProperty(name)) {
            return builtins[name](evaluatedKeywordArgs, evaluatedArgs, env)
          } else {
            throw new Error(`No function or procedure exists by name ${name}`)
          }
        })
    }

    if (expression.type === 'PropertyGet') {
      return (
        Promise.resolve(evaluateExpression(expression.data.expression, env))
          .then(obj => obj[expression.data.key])
      )
    }
  }

  const evaluateStatement = function(statement, env) {
    if (statement.type === 'VariableSet') {
      return Promise.resolve(
        evaluateExpression(statement.data.expression, env)
      ).then(value => {
        env.vars[statement.data.name] = new LVariable(value)
      })
    }

    if (statement.type === 'VariableChange') {
      const name = statement.data.name

      if (env.vars[name]) {
        return Promise.resolve(
          evaluateExpression(statement.data.expression, env)
        ).then(value => {
          env.vars[name].value = value
        })
      } else {
        throw new Error(`Attempt to change nonexistant variable ${name}?`)
      }
    }

    if (statement.type === 'ReturnStatement') {
      return Promise.resolve(
        evaluateExpression(statement.data.expression, env)
      ).then(value => {
        env.returnVal(value)
      })
    }

    if (statement.type === 'IfStatement') {
      return Promise.resolve(
        evaluateExpression(statement.data.test, env)
      ).then(value => {
        // urgh, here comes the JS truthy-ness
        if (value) {
          return asyncEach(statement.data.statements, statement => {
            return evaluateStatement(statement, env)
          })
        }
      })
    }

    if (statement.type === 'ProcedureDefinition') {
      // Could do this but we *kind of* want hoisting even though hoisting is
      // $BAD$..
      //const parentEnvVars = Object.assign({}, env.vars)
      const parentEnvVars = env.vars

      const hook = (obj = {}, args = []) => {
        const procEnv = new LEnvironment()
        procEnv.globalData = globalData
        Object.assign(procEnv.vars, parentEnvVars)

        let cancel = null
        let returnValue

        procEnv.on('returned', value => {
          if (cancel) {
            cancel()
            returnValue = value
          }
        })

        if (Object.keys(obj).length) {
          console.warn(
            'Keyword arguments cannot be passed to user procedures yet!' +
            `(From ${statement.data.name} call)`
          )
        }

        const params = statement.data.parameters
        for (let i = 0; i < args.length && i < params.length; i++) {
          procEnv.vars[params[i]] = new LVariable(args[i])
        }

        return asyncEach(statement.data.statements, (statement, _cancel) => {
          cancel = _cancel

          return evaluateStatement(statement, procEnv)
        }).then(() => {
          cancel = null
          return returnValue
        })
      }

      env.vars[statement.data.name] = new LVariable(hook)

      return
    }

    return evaluateExpression(statement, env)
  }

  const globalEnv = new LEnvironment()
  globalEnv.globalData = globalData

  return asyncEach(program.data.statements, statement => {
    return evaluateStatement(statement, globalEnv)
  }).then(() => {
    const hooks = {}

    for (let varName of Object.keys(globalEnv.vars)) {
      const { value } = globalEnv.vars[varName]
      if (value instanceof Function) {
        hooks[varName] = value
      }
    }

    return hooks
  })
}

const getHooks = function(code, opts) {
  const program = parser(code)

  return interpret(program, opts)
}

module.exports = getHooks
