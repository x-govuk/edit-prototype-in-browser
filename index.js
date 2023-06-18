const gpk = require('govuk-prototype-kit')

function setupRouter () {
  const router = gpk.requests.setupRouter('/plugin-routers/x-govuk/edit-prototype-in-browser')
  router.get('hello', (req, res) => {
    res.send('Hi there')
  })
}

module.exports = {
  setupRouter
}
