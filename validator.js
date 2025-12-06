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
  'block.shortText.placeholder': "Sorry, I can't accept any responses now.",
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

// Validator for legal and yes_no fields that handles both:
// - New QR responses (string values like 'I Accept')
// - Old postback responses (boolean values like true/false) for backward compatibility
function validateLegalYesNo(field, messages) {
  const { message: q } = translator(field)
  const payloadValues = q.quick_replies.map(r => JSON.parse(r.payload).value)

  return r => {
    // Extract value from object if it's a postback payload
    let responseValue = (r && typeof r === 'object' && r.value !== undefined) ? r.value : r

    // Backward compatibility: map old boolean postback values to new string values
    // Old format used true for first option, false for second
    if (responseValue === true) {
      responseValue = payloadValues[0]
    } else if (responseValue === false) {
      responseValue = payloadValues[1]
    }

    return _validateMC(responseValue, payloadValues, messages)
  }
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
  return __ => ({ message: responseMessage || messages['block.shortText.placeholder'] , valid: false })
}

// Normalize unicode numerals to Latin numerals for comparison purposes.
// Preserves original input - only returns normalized version.
// Supports 30+ numeral systems: Arabic-Indic, Extended Arabic-Indic, Devanagari, Bengali,
// Gujarati, Kannada, Malayalam, Oriya, Tamil, Telugu, Tibetan, Myanmar, Thai, Khmer, Lao,
// Mongolian, Limbu, New Tai Lue, Tai Tham, Balinese, Sundanese, Lepcha, Ol Chiki, Vai,
// Saurashtra, Kayah Li, Javanese, Cham, Meetei Mayek, and Fullwidth numerals.
function normalizeUnicodeNumerals(value) {
  if (typeof value !== 'string') return value

  // Map of unicode numeral ranges [startCode, endCode]
  // Each range has exactly 10 consecutive characters for digits 0-9
  const ranges = [
    [0x0660, 0x0669], // Arabic-Indic: ٠-٩
    [0x06F0, 0x06F9], // Extended Arabic-Indic: ۰-۹
    [0x0966, 0x096F], // Devanagari: ०-९
    [0x09E6, 0x09EF], // Bengali: ০-৯
    [0x0AE6, 0x0AEF], // Gujarati: ૦-૯
    [0x0B66, 0x0B6F], // Oriya: ୦-୯
    [0x0BE6, 0x0BEF], // Tamil: ௦-௯
    [0x0C66, 0x0C6F], // Telugu: ౦-౯
    [0x0CE6, 0x0CEF], // Kannada: ೦-೯
    [0x0D66, 0x0D6F], // Malayalam: ൦-൯
    [0x0E50, 0x0E59], // Thai: ๐-๙
    [0x0ED0, 0x0ED9], // Lao: ໐-໙
    [0x0F20, 0x0F29], // Tibetan: ༠-༩
    [0x1040, 0x1049], // Myanmar: ၀-၉
    [0x1090, 0x1099], // Myanmar Extended-A: ႐-႙
    [0x17E0, 0x17E9], // Khmer: ០-៩
    [0x1810, 0x1819], // Mongolian: ᠐-᠙
    [0x1946, 0x194F], // Limbu: ᥆-᥏
    [0x19D0, 0x19D9], // New Tai Lue: ᧐-᧙
    [0x1A80, 0x1A89], // Tai Tham: ᪀-᪉
    [0x1A90, 0x1A99], // Tai Tham: ᪐-᪙
    [0x1B50, 0x1B59], // Balinese: ᭐-᭙
    [0x1BB0, 0x1BB9], // Sundanese: ᮰-᮹
    [0x1C40, 0x1C49], // Lepcha: ᱀-᱉
    [0x1C50, 0x1C59], // Ol Chiki: ᱐-᱙
    [0xA620, 0xA629], // Vai: ꘠-꘩
    [0xA8D0, 0xA8D9], // Saurashtra: ꣐-꣙
    [0xA900, 0xA909], // Kayah Li: ꤀-꤉
    [0xA9D0, 0xA9D9], // Javanese: ꧐-꧙
    [0xA9F0, 0xA9F9], // Myanmar Extended-B: ꧰-꧹
    [0xAA50, 0xAA59], // Cham: ꩐-꩙
    [0xABF0, 0xABF9], // Meetei Mayek Extensions: ꯰-꯹
    [0xFF10, 0xFF19], // Fullwidth: ０-９
  ]

  let normalized = value

  ranges.forEach(([start, end]) => {
    for (let code = start; code <= end; code++) {
      const digit = String.fromCharCode(code)
      const latinDigit = String.fromCharCode(code - start + 0x30) // 0x30 is '0'
      normalized = normalized.split(digit).join(latinDigit)
    }
  })

  // Also normalize some common decimal separators used with non-Latin numerals
  normalized = normalized
    .replace(/٫/g, '.') // Arabic decimal separator (U+066B)
    .replace(/٬/g, ',') // Arabic comma separator (U+066C)
    .replace(/،/g, ',') // Arabic comma (U+060C)

  return normalized
}

function getLocaleSeparators(locale = 'en-US') {
  const parts = new Intl.NumberFormat(locale).formatToParts(1234.5)
  const decimalPart = parts.find(p => p.type === 'decimal')
  const groupPart = parts.find(p => p.type === 'group')
  const decimal = (decimalPart && decimalPart.value) || '.'
  const group = (groupPart && groupPart.value) || ','
  return { decimal, group }
}

function parseNumber(str, locale = 'en-US') {
  if (typeof str === 'number') return str
  if (typeof str === 'boolean') return null
  if (typeof str !== 'string') return null

  let value = str.trim()

  const { decimal, group } = getLocaleSeparators(locale)

  // 1. Remove thousands separator in original form (catches Unicode separators)
  if (group) {
    value = value.split(group).join('')
  }

  // 2. Remove spaces (thousands separator in some locales like fr-FR, ar-MA)
  value = value.replace(/\s/g, '')

  // 3. Normalize unicode (digits + Arabic separators → ASCII)
  value = normalizeUnicodeNumerals(value)

  // 4. After normalization, also remove the ASCII equivalent of thousands separator
  //    (handles case where user types Arabic digits with ASCII punctuation)
  const normalizedGroup = normalizeUnicodeNumerals(group)
  const normalizedDecimal = normalizeUnicodeNumerals(decimal)

  if (normalizedGroup && normalizedGroup !== normalizedDecimal) {
    value = value.split(normalizedGroup).join('')
  }

  // 5. Replace decimal separator with dot
  if (normalizedDecimal && normalizedDecimal !== '.') {
    value = value.replace(normalizedDecimal, '.')
  }

  // 6. Validate: reject malformed input (multiple dots, letters, etc.)
  if (!/^[+-]?\d*\.?\d+$/.test(value) && !/^[+-]?\d+\.?$/.test(value)) {
    return null
  }

  const result = parseFloat(value)
  return isFinite(result) ? result : null
}

function _isNumber(num, locale) {
  return parseNumber(num, locale) !== null
}

function validateNumber(field, messages) {
  const { message: q } = translator(field)
  const md = JSON.parse(q.metadata)
  const locale = md.locale || 'en-US'
  return r => ({
    message: messages['label.error.range'],
    valid: _isNumber(r, locale)
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
  legal: validateLegalYesNo,
  yes_no: validateLegalYesNo,
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


module.exports = { validator, defaultMessage, followUpMessage, offMessage, normalizeUnicodeNumerals, parseNumber }
