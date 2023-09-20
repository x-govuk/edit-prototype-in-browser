const fsp = require('fs/promises')
const path = require('path')
const fse = require('fs-extra')
const bodyParser = require('body-parser')

const projectDir = process.cwd()
const packageDir = __dirname
const contextPath = '/plugin-routers/x-govuk/edit-prototype-in-browser'

const routesApi = require('govuk-prototype-kit').requests
const editorRouter = routesApi.setupRouter(contextPath)

editorRouter.use(bodyParser.json())

console.log('inserted routes.')

editorRouter.get('/', (req, res) => {
  res.send({})
})

function fileDescriptor (label, relativePath, type) {
  return {
    label,
    path: relativePath,
    type
  }
}

function withExtension (partialPath, extension) {
  let output = partialPath

  if (output.endsWith('.html')) {
    output = output.substring(0, output.length - '.html'.length)
  } else if (output.endsWith('.njk')) {
    output = output.substring(0, output.length - '.njk'.length)
  }

  output += `.${extension}`

  return output
}

async function loadNunjucks (njkPath) {
  const filePathsToTry = [
    njkPath,
    withExtension(njkPath, 'html'),
    withExtension(njkPath, 'njk'),
    `${njkPath}/index`,
    withExtension(`${njkPath}/index`, 'html'),
    withExtension(`${njkPath}/index`, 'njk')
  ].map(x => path.join(projectDir, 'app', 'views', x))

  while (filePathsToTry.length > 0) {
    const filePath = filePathsToTry.shift()
    try {
      const isFile = (await fsp.lstat(filePath)).isFile()
      if (isFile) {
        return {
          path: filePath,
          src: await fsp.readFile(filePath, 'utf8')
        }
      }
    } catch (e) {}
  }
}

async function addIfFileExistsAndCanBeEdited (files, label, relativeOrAbsolutePath, type) {
  const relativePath = relativeOrAbsolutePath.startsWith('/') || relativeOrAbsolutePath.substring(1, 3) === ':\\' ? path.relative(projectDir, relativeOrAbsolutePath) : relativeOrAbsolutePath
  if (relativePath.startsWith('node_modules') || relativePath.startsWith('.tmp')) {
    return
  }
  const pathToCheck = path.join(projectDir, relativePath)
  if (await fse.exists(pathToCheck)) {
    files.push(fileDescriptor(label, relativePath, type))
  }
}

editorRouter.get('/files-behind-url', async (req, res) => {
  const { url } = req.query
  if (!url) {
    res.status(400).send('No URL provided.')
    return
  }
  const view = await loadNunjucks(url)
  if (view) {
    const files = []
    await addIfFileExistsAndCanBeEdited(files, 'page', view.path, 'NUNJUCKS')
    const layoutMatch = view.src.match(/\{\s*%\s+extends\s+"([^"]+)"\s*%\s*}/)
    if (layoutMatch) {
      const njk = await loadNunjucks(layoutMatch[1])
      if (njk) {
        await addIfFileExistsAndCanBeEdited(files, 'layout', njk.path, 'NUNJUCKS')
      }
    }
    await addIfFileExistsAndCanBeEdited(files, 'config', 'app/config.json', 'JSON')
    await addIfFileExistsAndCanBeEdited(files, 'javascript', 'app/assets/javascripts/application.js', 'JS')
    await addIfFileExistsAndCanBeEdited(files, 'scss', 'app/assets/sass/application.scss', 'SCSS')
    await addIfFileExistsAndCanBeEdited(files, 'scss settings', 'app/assets/sass/settings.scss', 'SCSS')

    res.send({
      success: true,
      files
    })
  } else {
    res.send({
      success: false,
      error: {}
    })
  }
})

const checkFilePath = function (req, res, next) {
  const { filePath } = req.query
  if (!filePath) {
    res.status(400)
    res.send({
      success: false,
      reason: 'No filePath provided (in query string)'
    })
  } else if (filePath.includes('..')) {
    res.status(403)
    res.send({
      success: false,
      reason: 'FilePath seems to be traversing using "..", that\'s not allowed here'
    })
  } else if (filePath.includes('node_modules')) {
    res.status(403)
    res.send({
      success: false,
      reason: 'FilePath seems to be inside node_modules, that\'s not allowed here'
    })
  } else {
    next()
  }
}

editorRouter.get('/file-contents', [checkFilePath], async (req, res) => {
  const { filePath } = req.query

  try {
    const contents = await fsp.readFile(path.join(projectDir, filePath), 'utf8')

    res.send({ success: true, contents })
  } catch (e) {
    console.error(e)
    res.status(500)
    res.send({
      success: false,
      error: {
        message: e.message
      }
    })
  }
})

editorRouter.post('/file-contents', [checkFilePath], async (req, res) => {
  const { filePath } = req.query
  const { contents, mode } = req.body
  const fullPath = path.join(projectDir, filePath)

  if (mode === 'write') {
    await fsp.writeFile(fullPath, contents)
    res.send({ success: true })
  } else if (mode === 'delete') {
    await fse.remove(fullPath)
    res.send({ success: true })
  }
})

routesApi.serveDirectory(`${contextPath}/monaco-editor/min`, path.join(packageDir, 'node_modules', 'monaco-editor', 'min'))
routesApi.serveDirectory(`${contextPath}/monaco-editor/min`, path.join(projectDir, 'node_modules', 'monaco-editor', 'min'))
routesApi.serveDirectory(`${contextPath}/monaco-editor/min-maps`, path.join(packageDir, 'node_modules', 'monaco-editor', 'min-maps'))
routesApi.serveDirectory(`${contextPath}/monaco-editor/min-maps`, path.join(projectDir, 'node_modules', 'monaco-editor', 'min-maps'))
