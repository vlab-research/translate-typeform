const { translator } = require('./translate-fields')
const emailValidator = require('email-validator')
const phone = require('phone')
// allow for custom error messages from metadata!

const defaultMessages = {
  'label.error.mustEnter': 'Sorry, that answer is not valid. Please try to answer the question again.',
  'label.error.mustSelect': 'Sorry, please use the buttons provided to answer the question.',
  'label.error.emailAddress': 'Sorry, please enter a valid email address.',
  'label.error.phoneNumber': 'Sorry, please enter a valid phone number.',
  'label.error.range': 'Sorry, please enter a valid number.',
  'label.buttonHint.default': "Hello, we just wanted to send a friendly follow up. If you would like to stop the survey, just ignore this message and we won't bother you again.",
  'label.error.mustAccept': "We're sorry, but this survey is now over and closed.",
}

function _validateMC(r, titles, messages) {

  // Messenger will return us numbers in JSON,
  // but typeform mostly uses strings, except for booleans.
  // So we cast everything to strings, to compare with QR's
  return {
    message: messages['label.error.mustSelect'],
    valid: titles.map(t => '' + t).indexOf('' + r) !== -1
  }
}

function validateQR(field, messages) {
  const { message: q } = translator(field)
  const titles = q.quick_replies.map(r => r.title)

  return r => _validateMC(r, titles, messages)
}


function validateButton(field, messages) {
  const { message: q } = translator(field)

  const titles = q.attachment.payload.buttons
    .map(r => JSON.parse(r.payload).value)

  return r => _validateMC(r.value, titles, messages)
}


function alwaysTrue(field, messages) {

  // should not need a message, it's always valid!
  return __ => ({ message: 'Error', valid: true })
}

function validateString(field, messages) {
  return r => ({
    message: messages['label.error.mustEnter'],
    valid: typeof r === 'string'
  })
}

function validateStatement(field, messages) {

  // this could be made more generic, but enough for now.
  const { responseMessage } = field.md ? field.md : {}
  return __ => ({ message: responseMessage || 'No response is necessary.', valid: false })
}

function _isNumber(num) {
  if (typeof num === 'string') {
    num = num.replace(/,/g, '')
    num = num.replace(/\./g, '')
    num = num.trim()
    return !!num && num * 0 === 0
  }

  if (typeof num == "boolean") {
    return false
  }

  // anything else must be a proper number
  return true
}

function validateNumber(field, messages) {
  return r => ({
    message: messages['label.error.range'],
    valid: _isNumber(r)
  })
}

function _isEmail(mail) {
  return emailValidator.validate(mail)
}

function validateEmail(field, messages) {
  return r => ({
    message: messages['label.error.emailAddress'],
    valid: _isEmail(r)
  })
}

function _isPhone(number, country, mobile) {
  return !!phone('' + number, country, !mobile)[0]
}

function validatePhone(field, messages) {
  const { message: q } = translator(field)
  const md = JSON.parse(q.metadata)
  const country = md.validate && md.validate.country
  const mobile = md.validate && md.validate.mobile

  return r => ({
    message: messages['label.error.phoneNumber'],
    valid: _isPhone(r, country || '', mobile)
  })
}

function validateNotify(field, messages) {
  const { message: q } = translator(field)
  const md = JSON.parse(q.metadata)

  return r => {
    const valid = r.ref === md.ref
    const message = messages['label.error.mustSelect']
    return { message, valid }
  }
}


function validateUpload(field, messages) {
  const { message: q } = translator(field)
  const md = JSON.parse(q.metadata)

  const uploadType = md.upload && md.upload.type

  return r => {
    const url = r && r.payload && r.payload.url
    const validType = (r && r.type) === uploadType
    const valid = validType && !!url
    const message = messages['label.error.mustEnter']
    return { message, valid }
  }
}


// upload

const lookup = {
  number: validateNumber,
  statement: validateStatement,
  thankyou_screen: validateStatement,
  multiple_choice: validateQR,
  rating: validateQR,
  opinion_scale: validateQR,
  legal: validateButton,
  yes_no: validateButton,
  short_text: validateString,
  long_text: validateString,
  share: validateStatement,
  webview: validateStatement,
  wait: validateStatement,
  notify: validateNotify,
  email: validateEmail,
  phone_number: validatePhone,
  upload: validateUpload,
}


function _validationMessages(messages = {}) {
  return { ...defaultMessages, ...messages }
}

function offMessage(messages = {}) {
  messages = _validationMessages(messages)
  return messages['label.error.mustAccept']
}

function defaultMessage(messages = {}) {
  messages = _validationMessages(messages)
  return messages['label.error.mustEnter']
}

function followUpMessage(messages = {}) {
  messages = _validationMessages(messages)
  return messages['label.buttonHint.default']
}

// should just get messages directly?
function validator(field, messages = {}) {
  messages = _validationMessages(messages)

  const fn = lookup[field.type]
  if (!fn) {
    throw new TypeError(`There is no translator for the question of type ${field.type}`)
  }
  return fn(field, messages)
}


module.exports = { validator, defaultMessage, followUpMessage, offMessage }
