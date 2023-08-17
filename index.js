const path = require('path')

module.exports = {
  addRoutes: () => {
    const display = (lines) => {
      const padding = 10
      const longestLineLength = lines.map(line => line.length).sort((a, b) => { if (a > b) { return -1 } if (b > a) { return 1 } return 0 }).at(0) + padding
      const consoleColumns = process.stdout.columns
      const isTooLongToCentre = consoleColumns < longestLineLength
      const separatorChar = '*'
      let separator = ''
      while (separator.length < (isTooLongToCentre ? 20 : longestLineLength)) {
        if (separator.length > 0) {
          separator += ' '
        }
        separator += separatorChar
      }
      console.log('')
      console.log(separator)
      lines.forEach(line => {
        if (isTooLongToCentre) {
          console.log(line)
          return
        }
        const paddingSizeEachSide = Math.floor((separator.length - line.length) / 2)
        let pad = ''
        while (pad.length < paddingSizeEachSide) {
          pad += ' '
        }
        console.log(`${pad}${line}${pad}`)
      })
      console.log(separator)
      console.log('')
    }
    let fileName, lineNumber
    try {
      throw new Error()
    } catch (e) {
      try {
        [fileName, lineNumber] = e.stack.split('\n')[2]?.split('(')[1]?.split(')')[0]?.replace(process.cwd() + path.sep, '').split(':')
      } catch (e) {}
    }
    const output = ['You no longer to use need the `addRoutes` line.', 'This line used to be needed to enable the in-browser editor.']
    if (fileName) {
      output.push('')
      output.push(`It looks like the line you need to remove is in ${fileName}` + (lineNumber ? ` on line ${lineNumber}.` : '.'))
    }
    display(output)
  }
}
