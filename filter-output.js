var fs = require("fs")
var linefeed = require("linefeed")
var path = require("path")

var filters = fs.readFileSync(
  path.join(__dirname, "filter-output.txt")
).toString().split("\n").filter(function (line) {
  return /\S/.test(line)
}).map(function (line) {
  return new RegExp(line)
})

module.exports = function (output) {
  return linefeed.transform(output, function (lines) {
    return lines.filter(function (line) {
      return filters.every(function (filter) {
        return !filter.test(line)
      })
    })
  })
}
