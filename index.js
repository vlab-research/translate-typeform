const t = require('./translate-fields')
const v = require('./validator')
const yaml = require('js-yaml')

function translateForm(form, messages) {
  const f = { ...form }
  f.fields = [...f.fields, ...f.thankyou_screens.map(s => ({ ...s, type: 'thankyou_screen' }))]
  f.custom_messages = messages
  return f
}

const mdLinkPattern = new RegExp(/\[([^\]]*)\]\(([^\)]+)\)/)

function removeMdLinks(s) {
  if (typeof s === 'string' || s instanceof String) {
    return s.replace(mdLinkPattern, "$1")
  }
  return s
}

function cleanStrings(obj) {
  if (Array.isArray(obj)) {
    return obj.map(cleanStrings)
  }

  if (obj !== null && typeof obj === 'object') {
    for (let k in obj) {
      obj[k] = cleanStrings(obj[k])
    }
    return obj
  }

  return removeMdLinks(obj)
}

function addCustomType(field) {

  if (field.properties && field.properties.description) {
    let d = field.properties.description.trim()

    try {
      let params = yaml.safeLoad(d)
      params = cleanStrings(params)

      if (typeof params !== 'object') {
        return field
      }

      if (params && params.type) {
        return { ...field, type: params.type, md: { ...field.md, ...params } }
      }
      if (params) {
        return { ...field, md: { ...field.md, ...params } }
      }
    }
    catch (e) {

      // yaml parsing error?
      return field
    }
  }
  return field
}

module.exports = { ...t, ...v, translateForm, addCustomType }
