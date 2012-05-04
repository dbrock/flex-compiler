#!/usr/bin/env node

var FCSH = require("./flex-home.js") + "/bin/fcsh"
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
          fcsh.emit("fcsh:ready")
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
        fcsh.lines.shift()
        fcsh.targets[fcsh.command] = match[1]
        console.log("[%d] %s", match[1], fcsh.command)
      } else if (line.match(/^Loading configuration file /)) {
        fcsh.lines.shift()
      } else if (line.match(/^Recompile: /)) {
        fcsh.lines.shift()
      } else if (line.match(/^Reason: /)) {
        fcsh.lines.shift()
      } else if (line.match(/^Files changed: /)) {
        fcsh.lines.shift()
      } else if (line.match(/^fcsh: Target (\d+) not found$/)) {
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

  return fcsh
}

if (module === require.main) {
  var args = process.argv.slice(2)
  var fcsh = module.exports()

  log.verbose = args[0] === "--verbose" && (args.shift(), true)

  if (args.length) {
    fcsh.run_command(args.join(" "), function (lines) {
      lines.forEach(function (line) {
        console.log(line)
      })

      process.exit()
    })
  } else {
    var prompt = "Flex-Compiler> "
    var readline = require("readline").createInterface(
      process.stdin, process.stdout, null
    )

    readline.setPrompt(colors.bold(prompt), prompt.length)

    fcsh.on("fcsh:ready", function () {
      readline.prompt()
    })

    readline.on("line", function (line) {
      fcsh.run_command(line, function (lines) {
        lines.forEach(function (line) {
          console.log(line)
        })

        readline.prompt()
      })
    })

    readline.on("close", function () {
      process.exit()
    })
  }
}