const t = require('./translate-fields')
const v = require('./validator')

function translateForm(form, messages) {
  const f = {...form}
  f.fields = [...f.fields, ...f.thankyou_screens.map(s => ({...s, type: 'thankyou_screen'}))]
  f.custom_messages = messages
  return f
}

module.exports = {...t, ...v, translateForm}
