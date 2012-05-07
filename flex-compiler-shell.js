#!/usr/bin/env node

var FCSH = require("./flex-compiler-home.js") + "/bin/fcsh"
var child_process = require("child_process")
var colors = require("colors")
var inspect = require("util").inspect
var log = require("./log.js")
var on_stream_line = require("on-stream-line")

module.exports = function () {
  var fcsh = child_process.spawn(FCSH)

  log("Starting %s...", FCSH)

  fcsh.callbacks = []
  fcsh.command = null
  fcsh.lines = []
  fcsh.queue = []
  fcsh.targets = {}
  fcsh.virgin = true

  on_stream_line(fcsh.stdout, { prompt: "(fcsh) " }, function (line) {
    var match

    if (line === "(fcsh) ") {
      setTimeout(function () {
        var command = fcsh.command
        var lines = fcsh.lines

        log.detail("Ready for commands.")

        if (fcsh.virgin) {
          fcsh.virgin = false
          fcsh.emit("fcsh-initialized")
        }

        fcsh.command = null
        fcsh.lines = []

        if (command !== null && fcsh.callbacks.length) {
          fcsh.callbacks.shift()(lines)
        }

        if (fcsh.queue.length) {
          fcsh.run_command(fcsh.queue.shift(), fcsh.callbacks.shift())
        }
      }, 10)
    } else {
      fcsh.add_output_line(line)

      if ((match = line.match(/^fcsh: Assigned (\d+) /))) {
        fcsh.drop_output_line()
        fcsh.targets[fcsh.command] = match[1]
        log("[%d] %s", match[1], fcsh.command)
      } else if (line.match(/^Loading configuration file /)) {
        fcsh.drop_output_line()
      } else if (line.match(/^Recompile: /)) {
        fcsh.drop_output_line()
      } else if (line.match(/^Reason: /)) {
        fcsh.drop_output_line()
      } else if (line.match(/^Files changed: /)) {
        fcsh.drop_output_line()
      } else if (line.match(/\.sw[fc] \(\d+ bytes\)$/)) {
        fcsh.drop_output_line()
      } else if (line.match(/^Nothing has changed since the last compile/)) {
        fcsh.drop_output_line()
      } else if (line.match(/^fcsh: Target (\d+) not found$/)) {
        fcsh.drop_output_line()

        var command = fcsh.command

        if (fcsh.targets[command]) {
          delete fcsh.targets[command]
          log("Target not found; creating new target...")

          fcsh.wrap_callback(function (lines, callback) {
            fcsh.callbacks.unshift(callback)
            fcsh._send_command(command)
          })
        }
      }
    }
  })

  fcsh.drop_output_line = function () {
    fcsh.lines.pop()
  }

  fcsh.add_output_line = function (line) {
    if (line !== "") {
      if (fcsh.callbacks.length) {
        log.detail("<< %s", line)
        fcsh.lines.push(line)
      } else {
        log("<< %s", line)
      }
    }
  }

  on_stream_line(fcsh.stderr, function (line) {
    var match

    fcsh.add_output_line(line)

    if ((match = line.match(/^Error: unable to open /))) {
      log.detail("Discarding other output.")
      fcsh.wrap_callback(function (lines, callback) {
        callback([line])
      })
    }
  })

  fcsh.wrap_callback = function (fn) {
    var callback = fcsh.callbacks.shift()

    if (callback) {
      fcsh.callbacks.unshift(function (lines) {
        fn(lines, callback)
      })
    } else {
      throw new Error("tried to wrap nonexistent callback")
    }
  }

  fcsh.on("exit", function (code, signal) {
    if (signal) {
      log("fcsh received %s", signal)
    } else {
      log("fcsh exited with code %d", code)
    }
  })

  fcsh._send_command = function (command) {
    if (fcsh.command !== null || fcsh.virgin) {
      fcsh.queue.push(command)
    } else {
      fcsh.command = command

      if (fcsh.targets[command]) {
        command = "compile " + fcsh.targets[command]
      }

      log(colors.bold("fcsh> ") + command)
      fcsh.stdin.write(command + "\n")
    }
  }

  fcsh.run_command = function (command, callback) {
    fcsh._send_command(command)
    fcsh.callbacks.push(callback)
  }

  fcsh.run_user_command = function (command, callback) {
    if (command instanceof Array) {
      // XXX: This will fail when quoting is needed.
      command = command.join(" ")
    }

    fcsh.run_command(command, function (lines) {
      callback(require("flex-simplify-error")(lines.join("\n")))
    })
  }

  return fcsh
}

require("./define-main.js")(module, function (args) {
  var shell = module.exports()

  log.parse_argv(args)

  if (args.length) {
    shell.run_user_command(args, function (output) {
      console.log(output)
      process.exit()
    })
  } else {
    var prompt = "fcsh> "
    var readline = require("readline").createInterface(
      process.stdin, process.stdout, null
    )

    readline.setPrompt(colors.bold(prompt), prompt.length)

    shell.on("fcsh-initialized", function () {
      readline.prompt()
    })

    readline.on("line", function (line) {
      shell.run_user_command(line, function (output) {
        console.log(output)
        readline.prompt()
      })
    })

    readline.on("close", function () {
      process.exit()
    })
  }
})
