(() => {
  window.XGOVUK = window.XGOVUK || {}
  window.XGOVUK.editPrototypeInBrowser = window.XGOVUK.editPrototypeInBrowser || {}

  if (window.XGOVUK.editPrototypeInBrowser.doNotEditThisPage) {
    return
  }

  if (!window.XGOVUK.editPrototypeInBrowser.allowedDomains) {
    window.XGOVUK.editPrototypeInBrowser.allowedDomains = [
      'localhost'
    ]
  }

  if (!window.XGOVUK.editPrototypeInBrowser.allowedDomains.includes(window.location.hostname)) {
    return
  }

  const routesContext = '/plugin-routers/x-govuk/edit-prototype-in-browser'

  const $monacoLoader = document.createElement('script')
  $monacoLoader.setAttribute('src', `${routesContext}/monaco-editor/min/vs/loader.js`)
  document.body.appendChild($monacoLoader)

  $monacoLoader.addEventListener('load', () => {
    const url = window.location.pathname

    const Types = {
      NUNJUCKS: { type: 'nunjucks', language: 'twig' },
      JSON: { type: 'json', language: 'json' },
      JS: { type: 'javascript', language: 'javascript' },
      SCSS: { type: 'scss', language: 'scss' }
    }

    function getType (type) {
      const result = Types[type] || {}
      return result
    }

    let currentEditor

    require.config({ paths: { vs: `${routesContext}/monaco-editor/min/vs` } })

    fetch(`${routesContext}/files-behind-url?url=${encodeURIComponent(url)}`)
      .then(x => x.json())
      .then(x => {
        if (x.success && x.files) {
          x.files.forEach(file => {
            showEditButton(file)
          })
        }
      })
      .catch(e => {
        console.error(e)
      })

    function addChild ($parent, tag, classes = []) {
      const $newElem = document.createElement(tag)
      $parent.appendChild($newElem)
      classes.forEach(x => $newElem.classList.add(x))
      return $newElem
    }

    function httpPost (url, jsonBody) {
      return fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(jsonBody)
      })
    }

    function setupMenu () {
      if (setupMenu.result) {
        return setupMenu.result
      }
      const $bar = addChild(document.body, 'section', ['x-govuk-epib__bar'])
      const $toastMessage = addChild($bar, 'div', ['x-govuk-epib__toast-message'])
      const $menu = addChild($bar, 'nav', ['x-govuk-epib__bar--menu'])
      const $editor = addChild($bar, 'div', ['x-govuk-epib__editor', 'x-govuk-epib--hidden'])
      const $filenameBar = addChild($editor, 'div', ['x-govuk-epib__filename__bar'])
      const $filename = addChild($filenameBar, 'div', ['x-govuk-epib__filename'])
      const $codeWrapper = addChild($editor, 'div', ['x-govuk-epib__editor__codewrapper'])
      const $saveButton = addChild($editor, 'button', ['x-govuk-epib__editor__save-button'])
      const $cancelButton = addChild($editor, 'button', ['x-govuk-epib__editor__cancel-button'])

      const $deleteButton = addChild($editor, 'button', ['x-govuk-epib__editor__delete-button'])
      $saveButton.innerText = 'Save changes'
      $cancelButton.innerText = 'Cancel'

      $deleteButton.innerText = 'Delete file'

      function enterMenuMode () {
        $editor.classList.add('x-govuk-epib--hidden')
        $menu.classList.remove('x-govuk-epib--hidden')
      }

      function enterCodeMode () {
        $editor.classList.remove('x-govuk-epib--hidden')
        $menu.classList.add('x-govuk-epib--hidden')
      }

      setupMenu.result = { $menu, $editor, $codeWrapper, $saveButton, $deleteButton, enterMenuMode, enterCodeMode, $filename }

      $saveButton.addEventListener('click', (e) => {
        e.preventDefault()

        setupMenu.result.save()
      })

      $cancelButton.addEventListener('click', (e) => {
        e.preventDefault()

        enterMenuMode()
      })

      $deleteButton.addEventListener('click', (e) => {
        e.preventDefault()

        setupMenu.result.disableEverything()

        const deletePath = $deleteButton.getAttribute('data-save-path')
        if (window.confirm(`Are you sure you want to delete ${deletePath}?`)) {
          httpPost(`${routesContext}/file-contents?filePath=${encodeURIComponent(deletePath)}`, {
            mode: 'delete'
          })
            .then(() => {
              enterMenuMode()
              window.location.reload()
            })
            .catch(() => {
              ('Delete failed.')

              setupMenu.result.enableEverything()
            })
        } else {
          setupMenu.result.enableEverything()
        }
      })

      setupMenu.result.enableEverything = () => {
        $codeWrapper.disabled = false
        $saveButton.disabled = false
        $cancelButton.disabled = false
        $deleteButton.disabled = false
      }

      setupMenu.result.disableEverything = () => {
        $codeWrapper.disabled = true
        $saveButton.disabled = true
        $cancelButton.disabled = true
        $deleteButton.disabled = true
      }

      setupMenu.result.save = () => {
        setupMenu.result.disableEverything()

        const savePath = $saveButton.getAttribute('data-save-path')
        const url = `${routesContext}/file-contents?filePath=${encodeURIComponent(savePath)}`
        const jsonBody = {
          mode: 'write',
          contents: currentEditor.getValue()
        }
        httpPost(url, jsonBody)
          .then(() => {
            enterMenuMode()
            setupMenu.result.showToastMessage(`Successfully saved ${savePath}`, 'SUCCESS')
          })
          .catch(() => {
            setupMenu.result.showToastMessage('Save failed.', 'FAILURE')

            setupMenu.result.enableEverything()
          })
      }

      const toastTypeToClass = {
        SUCCESS: 'x-govuk-epib__toast-message--success',
        FAILURE: 'x-govuk-epib__toast-message--failure'
      }

      setupMenu.result.showToastMessage = (message, type) => {
        $toastMessage.innerText = message
        const classesToAddAndRemove = ['x-govuk-epib__toast-message--show']
        if (toastTypeToClass[type]) {
          classesToAddAndRemove.push(toastTypeToClass[type])
        }
        classesToAddAndRemove.forEach(c => $toastMessage.classList.add(c))

        window.setTimeout(() => {
          classesToAddAndRemove.forEach(c => $toastMessage.classList.remove(c))
        }, 4000)
      }

      return setupMenu.result
    }

    function showEditButton (fileConfig) {
      const { $menu, $codeWrapper, $saveButton, $deleteButton, enableEverything, enterCodeMode, save, $filename, showToastMessage } = setupMenu()

      const $editButton = addChild($menu, 'a', ['x-govuk-epib__bar--menu--item'])

      $editButton.innerText = ['Edit', fileConfig.label || fileConfig.path].join(' ')
      $editButton.setAttribute('href', '#')
      $editButton.addEventListener('click', (e) => {
        e.preventDefault()

        fetch(`${routesContext}/file-contents?filePath=${encodeURIComponent(fileConfig.path)}`)
          .then(x => x.json())
          .then(x => {
            if (x.success) {
              enableEverything()
              const contents = x.contents
              enterCodeMode()

              require(['vs/editor/editor.main'], function () {
                ;[...$codeWrapper.children].forEach($child => $codeWrapper.removeChild($child))
                const $code = addChild($codeWrapper, 'div', ['x-govuk-epib__editor__code'])
                $code.addEventListener('keydown', (e) => {
                  if (e.metaKey && e.keyCode === 83) {
                    e.preventDefault()
                    save()
                  }
                })
                $filename.innerHTML = fileConfig.path
                currentEditor = window.monaco.editor.create($code, {
                  value: contents,
                  language: getType(fileConfig.type).language
                })
              })
              $saveButton.setAttribute('data-save-path', fileConfig.path)
              $deleteButton.setAttribute('data-save-path', fileConfig.path)
            } else {
              console.error(x)
            }
          })
          .catch(e => {
            showToastMessage('Failed to load file contents ' + fileConfig.path, 'FAILURE')
            console.error(e)
          })
      })
    }
  })
})()
