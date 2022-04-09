const t = require('./translate-fields')
const v = require('./validator')
const yaml = require('js-yaml')
const mle = require('markdown-link-extractor');

function translateForm(form, messages) {
  const f = {...form}
  f.fields = [...f.fields, ...f.thankyou_screens.map(s => ({...s, type: 'thankyou_screen'}))]
  f.custom_messages = messages
  return f
}

function addCustomType(field) {
  if (field.properties && field.properties.description) {
    let d = field.properties.description.trim().replace(/\\_/g, '_')

    // replace markdown links in description, we don't want that shit.
    mle(d, true).links.forEach(l => {

      // but only if they're actually markdown links (check for square brackets)
      if (/\[[^\s]+\]/.test(l.raw)) {
        d = d.replace(l.raw, () => l.href)
      }
    })


    try {
      const params = yaml.safeLoad(d)

      if (typeof params !== 'object') {
        return field
      }

      if (params && params.type) {
        return {...field, type: params.type, md: params}
      }
      if (params) {
        return {...field, md: params}
      }
    }
    catch (e) {
      // yaml parsing error?
      return field
    }
  }
  return field
}

module.exports = {...t, ...v, translateForm, addCustomType}
