Edit prototype in browser
===

This is a plugin to the govuk-prototype-kit which adds an in-browser editor.

Requirements
---

This works with the [GOV.UK Prototype Kit](https://prototype-kit.service.gov.uk/docs/) v13.0.0 and above.

Setup
---

To enable the editor you need to install the package and add the router.  Open a terminal in your prototype's folder and run

```shell
npm install @x-govuk/edit-prototype-in-browser
```

Then go into your `app/routes.js` and add the following line:

```javascript
require('@x-govuk/edit-prototype-in-browser').addRoutes(require('govuk-prototype-kit').requests)
```

Phase: Beta
---

This is a beta product, we know that improvements need making and we'd like your feedback.

Issues and feedback
---

[https://github.com/x-govuk/edit-prototype-in-browser/issues]

