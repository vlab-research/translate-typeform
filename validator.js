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


function _isNumber(num) {
  // Type checking - reject booleans explicitly
  if (typeof num === 'boolean') {
    return false
  }

  // Non-string types (actual numbers) pass through
  if (typeof num !== 'string') {
    return true
  }

  // Reject mixed script numerals (e.g., "१२3" mixing Devanagari and ASCII)
  // This is not a realistic use case and indicates data corruption
  const digitMatches = Array.from(num.matchAll(/\p{Nd}/gu))
  if (digitMatches.length > 0) {
    // Helper function to identify script of a digit
    function getDigitScript(char) {
      const code = char.charCodeAt(0)
      if (code >= 0x0030 && code <= 0x0039) return 'ascii'
      if (code >= 0x0660 && code <= 0x0669) return 'arabic-indic'
      if (code >= 0x06F0 && code <= 0x06F9) return 'persian'
      if (code >= 0x0966 && code <= 0x096F) return 'devanagari'
      if (code >= 0x09E6 && code <= 0x09EF) return 'bengali'
      if (code >= 0x0BE6 && code <= 0x0BEF) return 'tamil'
      if (code >= 0x0E50 && code <= 0x0E59) return 'thai'
      return 'other'
    }

    // Check if all digits are from the same script
    const firstScript = getDigitScript(digitMatches[0][0])
    const allSameScript = digitMatches.every(match => getDigitScript(match[0]) === firstScript)

    if (!allSameScript) {
      return false // Reject mixed scripts
    }
  }

  // Normalize unicode numerals to latin numerals
  let normalized = normalizeUnicodeNumerals(num).trim()

  // Remove spaces (used as thousands separators in some locales)
  normalized = normalized.replace(/\s+/g, '')

  // Reject scientific notation (not valid form input)
  if (/[eE]/.test(normalized)) {
    return false
  }

  // Early validation: check that string only contains digits, +/-, and separators (. or ,)
  // This prevents "123abc" or "8888mil" from being accepted
  if (!/^[+-]?[\d.,]+$/.test(normalized)) {
    return false
  }

  // Intelligently handle separators to preserve decimal values
  // CRITICAL FIX: Don't blindly remove all dots/commas - distinguish between
  // decimal separators (preserve) and thousands separators (remove)
  const dotCount = (normalized.match(/\./g) || []).length
  const commaCount = (normalized.match(/,/g) || []).length

  if (dotCount + commaCount === 0) {
    // No separators - simple integer case
    const parsed = parseFloat(normalized)
    return !isNaN(parsed) && isFinite(parsed)
  }

  // Determine which separators are decimal vs thousands
  // Heuristic: If both types present, the one that appears last is the decimal separator
  if (dotCount > 0 && commaCount > 0) {
    // Both present - last one is decimal
    const lastDot = normalized.lastIndexOf('.')
    const lastComma = normalized.lastIndexOf(',')

    if (lastDot > lastComma) {
      // US-style format: 1,234.56 (commas are thousands, dot is decimal)
      normalized = normalized.replace(/,/g, '')
    } else {
      // European-style format: 1.234,56 (dots are thousands, comma is decimal)
      normalized = normalized.replace(/\./g, '').replace(',', '.')
    }
  } else if (dotCount === 1) {
    // Single dot - it's the decimal separator, keep it
    // (no change needed)
  } else if (commaCount === 1) {
    // Single comma - it's the decimal separator, normalize to dot
    normalized = normalized.replace(',', '.')
  } else if (dotCount > 1) {
    // Multiple dots - validate pattern to avoid accepting malformed input like "1.2.3"
    const lastDot = normalized.lastIndexOf('.')
    const afterDot = normalized.substring(lastDot + 1)
    const beforeDot = normalized.substring(0, lastDot)

    // Check if this looks like a valid thousands separator pattern
    // Valid: last separator followed by 1-3 digits (decimal), earlier ones separate groups
    if (afterDot.length > 0 && afterDot.length <= 3 && /^\d+$/.test(afterDot)) {
      // Check that the part before last dot has valid thousands separator positioning
      const beforeCleaned = beforeDot.replace(/\./g, '')
      const dotsBeforeLastDot = dotCount - 1

      // Validate: need at least 4 digits AND check that separator pattern makes sense
      // For ambiguous patterns like "100.50.25", check if middle groups are too short
      if (beforeCleaned.length >= 4 && dotsBeforeLastDot === 1) {
        // Exactly ONE thousands separator - validate the split makes sense
        // Split beforeDot by dots to get groups
        const groups = beforeDot.split('.')
        // For standard thousands, groups should be 3 digits (except first can be 1-3)
        // If we see groups of 1-2 digits in middle positions, it's suspicious
        const allGroupsValid = groups.every((g, idx) => {
          if (idx === 0) return g.length >= 1 && g.length <= 3  // First group: 1-3 digits OK
          return g.length === 3  // Other groups: must be exactly 3
        })

        if (allGroupsValid) {
          normalized = beforeCleaned + '.' + afterDot
        } else {
          // Pattern like "100.50.25" with non-standard grouping
          return false
        }
      } else if (beforeCleaned.length >= 7 && dotsBeforeLastDot >= 2) {
        // Multiple thousands separators - only valid if enough digits
        // Don't do detailed validation, just ensure enough total digits
        normalized = beforeCleaned + '.' + afterDot
      } else {
        // Not enough digits OR ambiguous pattern - reject
        return false
      }
    } else {
      // All are thousands separators (no decimal)
      normalized = normalized.replace(/\./g, '')
    }
  } else if (commaCount > 1) {
    // Multiple commas - validate pattern similarly
    const lastComma = normalized.lastIndexOf(',')
    const afterComma = normalized.substring(lastComma + 1)
    const beforeComma = normalized.substring(0, lastComma)

    if (afterComma.length > 0 && afterComma.length <= 3 && /^\d+$/.test(afterComma)) {
      const beforeCleaned = beforeComma.replace(/,/g, '')
      const commasBeforeLastComma = commaCount - 1

      // Check if this looks like Indian numbering (all thousands) vs decimal
      // Indian: "1,00,000" → groups of 3, 2, 2 (or similar patterns)
      // Decimal: "1,234.56" → last group is 1-2 digits (decimal)
      const allGroups = normalized.split(',')
      const hasDecimalPattern = afterComma.length <= 2  // Decimals typically 1-2 digits
      const hasThousandsPattern = afterComma.length === 3 && commaCount >= 2  // Indian lakh/crore

      if (hasThousandsPattern) {
        // Likely Indian numbering - treat all as thousands separators
        normalized = normalized.replace(/,/g, '')
      } else if (beforeCleaned.length >= 4 && commasBeforeLastComma === 1) {
        // One thousands separator before decimal
        const groups = beforeComma.split(',')
        const allGroupsValid = groups.every((g, idx) => {
          if (idx === 0) return g.length >= 1 && g.length <= 3
          return g.length === 3 || g.length === 2
        })

        if (allGroupsValid) {
          normalized = beforeCleaned + '.' + afterComma
        } else {
          return false
        }
      } else if (beforeCleaned.length >= 7 && commasBeforeLastComma >= 2) {
        // Multiple thousands separators with enough digits
        normalized = beforeCleaned + '.' + afterComma
      } else {
        // Malformed pattern like "1,2,3" → reject
        return false
      }
    } else {
      // All are thousands separators (no decimal)
      normalized = normalized.replace(/,/g, '')
    }
  }

  // Final validation using parseFloat
  // This properly handles decimal values unlike the old approach
  const parsed = parseFloat(normalized)
  return !isNaN(parsed) && isFinite(parsed)
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


module.exports = { validator, defaultMessage, followUpMessage, offMessage, normalizeUnicodeNumerals }
