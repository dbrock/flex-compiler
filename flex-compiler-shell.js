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
  fcsh.raw_lines = []
  fcsh.lines = []
  fcsh.queue = []
  fcsh.targets = {}
  fcsh.virgin = true

  on_stream_line(fcsh.stdout, { prompt: "(fcsh) " }, function (line) {
    var match

    if (line === "(fcsh) ") {
      setTimeout(function () {
        var command = fcsh.command
        var raw_lines = fcsh.raw_lines
        var lines = fcsh.lines
        var success = fcsh.success

        fcsh.command = null
        fcsh.lines = []
        fcsh.raw_lines = []
        delete fcsh.success

        log("Ready for commands.")

        if (command !== null && fcsh.callbacks.length) {
          if (!success && lines.every(function (line) {
            return (/\bwarning: /i).test(line)
          })) {
            if (raw_lines.length) {
              lines = raw_lines
            } else {
              lines = ["error: no output"]
            }
          }

          fcsh.callbacks.shift()(lines)
        } else if (fcsh.virgin) {
          fcsh.virgin = false
          fcsh.emit("fcsh-initialized")
        } else {
          throw new Error
        }

        if (fcsh.queue.length) {
          fcsh.run_command(fcsh.queue.shift(), fcsh.callbacks.shift())
        }
      }, 10)
    } else {
      log.detail("[stdout] %s", line)
      fcsh.add_output_line(line)

      if ((match = line.match(/^fcsh: Assigned (\d+) /))) {
        fcsh.drop_output_line()
        fcsh.targets[fcsh.command] = match[1]
        log("Will use `compile %d` instead of `%s`.", match[1], fcsh.command)
      } else if (line.match(/^Loading configuration file /)) {
        fcsh.drop_output_line()
      } else if (line.match(/^Recompile: /)) {
        fcsh.drop_output_line()
      } else if (line.match(/^Reason: /)) {
        fcsh.drop_output_line()
      } else if (line.match(/^Files changed: /)) {
        fcsh.drop_output_line()
      } else if (line.match(/\.sw[fc] \(\d+ bytes\)$/)) {
        fcsh.success = true
        fcsh.drop_output_line()
      } else if (line.match(/^Nothing has changed since the last compile/)) {
        fcsh.success = true
        fcsh.drop_output_line()
      } else if (line.match(/^fcsh: Target (\d+) not found$/)) {
        fcsh.drop_output_line()

        var command = fcsh.command

        if (fcsh.targets[command]) {
          log("Will not use `compile %d` again.", fcsh.targets[command])
          delete fcsh.targets[command]

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
        fcsh.raw_lines.push(line)
        fcsh.lines.push(line)
      }
    }
  }

  on_stream_line(fcsh.stderr, function (line) {
    var match

    log.detail("[stderr] %s", line)
    fcsh.add_output_line(line)

    if (/^Error: unable to open /.test(line)) {
      discard_other_output()
    } else if (/^Error: a target file must be specified$/.test(line)) {
      discard_other_output()
    }

    function discard_other_output() {
      log("Discarding other output.")
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

  fcsh.run_command = function (command, args, callback) {
    if (!command) {
      callback(["flex-compiler: missing command"])
    } else if ("mxmlc compc".split(" ").indexOf(command) === -1) {
      callback(["flex-compiler: no such command: " + command])
    } else if (args.length === 0) {
      callback(["flex-compiler: missing arguments to `" + command + "`"])
    } else {
      // XXX: This will fail when quoting is needed.
      fcsh._send_command([command].concat(args).join(" "))
      fcsh.callbacks.push(callback)
    }
  }

  return fcsh
}

require("./define-main.js")(module, function (args) {
  var shell = module.exports()

  log.parse_argv(args)

  if (args.length) {
    shell.run_user_command(args.shift(), args, function (output) {
      console.log(require("flex-simplify-error")(lines.join("\n")))
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
