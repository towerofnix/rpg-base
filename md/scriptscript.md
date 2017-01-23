# Scriptscript

Scriptscript is the programming language RPG Base uses. It's not a very good
programming language, but usually it's a bit better than JavaScript.

Every program you make with Scriptscript is called a *script*. That's because
your programs will usually be telling entities and the game and such what to
do, like an actor reading a script in a movie production.

The actual language is *very* simple.

A program is made of *procedure definitions*. Those are just blocks of code
that tell the computer what to do when something happens, usually. You can also
run your own procedures from your script but that's not usually necessary.

Procedure definitions contain their own block of code, which is made out of
*statements*. A statement is a command you're telling the computer (or an
actor) to do.

Here's an example script:

```
main() {
  talk-dialog('Hello, world!')
}
```

Generally this script will show the text 'Hello, world!' in a talk dialog when
the program is run. Of course, this relies on the context of `main` being used
immediately and `talk-dialog` being a defined built-in function, but for now
just try to imagine that those do work that way.

*Comments* are patches of text that aren't actually read by the computer, but
are there to help you (and possibly other people) remember how a behavior works
(or why you made a specific decision, or any other reason you might want to
use a comment - e.g. 'commenting out' or disabling code). They follow a simple
`--` syntax:

```
main() {
  -- This is a comment
  text-dialog('This is not a comment')

  -- text-dialog('This will not run')
}
```

Scripts can have multiple procedure defintions, which is handy when you're
making a more complicated behavior:

```
helpful-global-constant() {
  return 'Something here'
}

main() {
  talk-dialog(helpful-global-constant())
}
```

You can make *variables* like you would in any other programming language:

```
main() {
  cool-var = 'Rainbow value'
  talk-dialog(cool-var)
}
```

Scriptscript also has a way of dealing with more complicated procedures
(builtin only, for now) - *keyword arguments*. They behave basically the same
as they do in Python.

```
main() {
  talk-dialog('Hello..?' :: talk-speed=10)
}
```

That'll display a talk dialog with the message 'Hello..?' mostly the same as
usual, except that it'll reveal characters slower (because greater
`talk-speed`s mean slower text, *obviously*).
