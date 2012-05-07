var colors = require("colors")
var format = require("util").format

module.exports = log

function log() {
  if (log.verbose) {
    console.warn(colors.grey(format.apply(null, arguments)))
  }
}

log.verbose = false

log.detail = function () {
  if (log.verbose) {
    console.warn(colors.white(format.apply(null, arguments)))
  }
}

log.parse_argv = function (argv) {
  if (argv.length && /^-V|--verbose$/.test(argv[0])) {
    argv.shift(), log.verbose = true
  }
}
