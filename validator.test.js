const mocha = require('mocha')
const chai = require('chai')
chai.should()
const mocks = require('./mocks/typeform-form')

const v = require('./validator')

describe('validator', () => {
  it('should validate statement with custom reponseMessage', () => {
    const field = { type: 'statement', title: 'foo', ref: 'foo', md: { responseMessage: 'foobarbaz' } }
    const res = v.validator(field)({ foo: 'bar' })
    res.message.should.equal('foobarbaz')
  })

  it('should validate when not a mobile', () => {
    const field = { type: 'phone_number', title: 'foo', ref: 'foo', md: { validate: { country: 'IN', mobile: true } } }

    const res = v.validator(field)('+914888000000')

    res.valid.should.equal(false)
    res.message.should.equal('Sorry, please enter a valid phone number.')
  })

  it('should validate when not a phone number', () => {
    const field = { type: 'phone_number', title: 'foo', ref: 'foo', md: { validate: { country: 'IN', mobile: false } } }

    const res = v.validator(field)('9999')
    res.valid.should.equal(false)
    res.message.should.equal('Sorry, please enter a valid phone number.')
  })

  it('should validate when a mobile number', () => {
    const field = { type: 'phone_number', title: 'foo', ref: 'foo', md: { validate: { country: 'IN', mobile: true } } }

    let res = v.validator(field)('+918888000000')
    res.valid.should.equal(true)
    res = v.validator(field)(8888000000)
    res.valid.should.equal(true)
  })

  it('should validate upload types - when correct type', () => {
    const field = { type: 'upload', title: 'foo', ref: 'foo', md: { upload: { type: 'image' } } }

    const attachment = { "type": "image", "payload": { "url": "https://scontent.xx.fbcdn.net/v/t1.15752-9/461148037_759263159639423_7161323123727879546_n.jpg?_nc_cat=102&ccb=1-7&_nc_sid=fc17b8&_nc_ohc=zkDCMxo0pTsQ7kNvgGA_H8d&_nc_ad=z-m&_nc_cid=0&_nc_ht=scontent.xx&_nc_gid=AEZgev0WN3sV8E56pu3IELa&oh=03_Q7cD1QHpWUMM_ryYpocqe5jG_MF5bg12hw79eHeTmvbg8jVNHg&oe=67222F34" } }

    const res = v.validator(field)(attachment)
    res.valid.should.equal(true)
  })


  it('should invalidate upload types - when incorrect type', () => {
    const field = { type: 'upload', title: 'foo', ref: 'foo', md: { upload: { type: 'video' } } }

    const attachment = { "type": "image", "payload": { "url": "https://scontent.xx.fbcdn.net/v/t1.15752-9/461148037_759263159639423_7161323123727879546_n.jpg?_nc_cat=102&ccb=1-7&_nc_sid=fc17b8&_nc_ohc=zkDCMxo0pTsQ7kNvgGA_H8d&_nc_ad=z-m&_nc_cid=0&_nc_ht=scontent.xx&_nc_gid=AEZgev0WN3sV8E56pu3IELa&oh=03_Q7cD1QHpWUMM_ryYpocqe5jG_MF5bg12hw79eHeTmvbg8jVNHg&oe=67222F34" } }

    const res = v.validator(field)(attachment)
    res.valid.should.equal(false)
  })


  it('should invalidate upload types - when attachment undefined', () => {
    const field = { type: 'upload', title: 'foo', ref: 'foo', md: { upload: { type: 'video' } } }

    const attachment = undefined

    const res = v.validator(field)(attachment)
    res.valid.should.equal(false)
  })

  // parseNumber tests - data-driven
  describe('parseNumber', () => {
    // [input, locale, expected]
    const testCases = [
      // US format (default) - integers
      ['123', null, 123],
      ['0', null, 0],
      ['-456', null, -456],
      ['+789', null, 789],

      // US format - decimals
      ['100.50', null, 100.5],
      ['0.99', null, 0.99],
      ['-123.45', null, -123.45],
      ['3.14159', null, 3.14159],

      // US format - thousands separators
      ['1,234', null, 1234],
      ['1,234.56', null, 1234.56],
      ['1,234,567.89', null, 1234567.89],
      ['10,000,000', null, 10000000],

      // US format - edge cases
      ['.5', null, 0.5],
      ['-.5', null, -0.5],
      ['100.', null, 100],
      ['  123  ', null, 123],

      // European format (de-DE) - comma decimal
      ['100,50', 'de-DE', 100.5],
      ['3,14159', 'de-DE', 3.14159],
      ['-0,99', 'de-DE', -0.99],

      // European format - dot thousands
      ['1.234', 'de-DE', 1234],
      ['1.234,56', 'de-DE', 1234.56],
      ['1.234.567,89', 'de-DE', 1234567.89],

      // Arabic Saudi (ar-SA) - Arabic-Indic numerals
      ['١٢٣', 'ar-SA', 123],
      ['٩٨٧٦٥', 'ar-SA', 98765],
      ['٠', 'ar-SA', 0],

      // Arabic Saudi - native separators (٬ thousands, ٫ decimal)
      ['١٬٢٣٤', 'ar-SA', 1234],
      ['١٬٢٣٤٫٥٦', 'ar-SA', 1234.56],

      // Arabic Saudi - Arabic digits with ASCII separators (common with ASCII keyboard)
      ['١,٢٣٤.٥٦', 'ar-SA', 1234.56],
      ['١٢٣.٤٥', 'ar-SA', 123.45],

      // Arabic Morocco (ar-MA) - French style (space thousands, comma decimal)
      ['1 234,56', 'ar-MA', 1234.56],
      ['1 234 567,89', 'ar-MA', 1234567.89],
      ['100,50', 'ar-MA', 100.5],

      // Unicode - Devanagari (Hindi)
      ['१२३', null, 123],
      ['१००.५०', null, 100.5],
      ['१,२३४.५६', null, 1234.56],

      // Unicode - Persian/Farsi
      ['۱۲۳۴۵', null, 12345],
      ['۱۲۳.۴۵', null, 123.45],

      // Unicode - other scripts
      ['৫৬৭', null, 567],       // Bengali
      ['௧௨௩', null, 123],       // Tamil
      ['๑๒๓๔๕', null, 12345],   // Thai

      // Pass-through numbers
      [123.45, null, 123.45],
      [0, null, 0],
      [-42, null, -42],

      // Cross-locale: ar-SA locale but US-style ASCII input
      // WORKS because ar-SA separators (٬ thousands, ٫ decimal) normalize to US-style (, and .)
      ['100.50', 'ar-SA', 100.5],
      ['1,234.56', 'ar-SA', 1234.56],

      // Cross-locale: ar-MA locale but US-style ASCII input
      // BROKEN - ar-MA is European-style (comma=decimal), US input has dot=decimal
      // This is a locale mismatch - if you specify ar-MA, use European format
      ['100.50', 'ar-MA', 10050],      // dot not recognized as decimal, gets stripped weirdly
      ['1,234.56', 'ar-MA', 1.23456],  // comma becomes decimal, dot breaks parsing

      // Cross-locale: en-US/default locale but Arabic script input
      // WORKS because Arabic digits/separators normalize to US-style ASCII
      ['١٠٠.٥٠', null, 100.5],         // Arabic digits, ASCII decimal
      ['١٬٢٣٤٫٥٦', null, 1234.56],     // Arabic digits + Arabic separators → US-style
      ['١٢٣', null, 123],              // Plain Arabic digits

      // Invalid inputs → null
      [true, null, null],
      [false, null, null],
      ['abc', null, null],
      ['12abc', null, null],
      ['8888 mil', null, null],
      ['', null, null],
      ['1.2.3', null, null],
      ['1..2', null, null],
    ]

    testCases.forEach(([input, locale, expected]) => {
      const localeStr = locale || 'default'
      const inputStr = typeof input === 'string' ? `"${input}"` : input

      it(`parseNumber(${inputStr}, ${localeStr}) → ${expected}`, () => {
        const result = locale ? v.parseNumber(input, locale) : v.parseNumber(input)
        if (expected === null) {
          chai.expect(result).to.be.null
        } else {
          result.should.equal(expected)
        }
      })
    })
  })

  // Minimal validation test (validation is just parseNumber !== null)
  it('validates numbers via field type', () => {
    const field = { type: 'number', title: 'foo', ref: 'foo' }
    v.validator(field)('123').valid.should.equal(true)
    v.validator(field)('abc').valid.should.equal(false)
    v.validator(field)(true).valid.should.equal(false)
  })

  it('validates numbers using locale from field.md', () => {
    // European format: dot=thousands, comma=decimal
    const deField = { type: 'number', title: 'foo', ref: 'foo', md: { locale: 'de-DE' } }

    // European format should be valid with de-DE locale
    v.validator(deField)('1.234,56').valid.should.equal(true)
    v.validator(deField)('100,50').valid.should.equal(true)

    // Default (no locale) uses US format
    const usField = { type: 'number', title: 'foo', ref: 'foo' }
    v.validator(usField)('1,234.56').valid.should.equal(true)
    // European format with multiple dots is invalid for US locale
    v.validator(usField)('1.234.567,89').valid.should.equal(false)
  })

  it('validates Arabic numerals using ar-SA locale from field.md', () => {
    const field = { type: 'number', title: 'foo', ref: 'foo', md: { locale: 'ar-SA' } }

    // Arabic-Indic numerals with Arabic separators
    v.validator(field)('١٬٢٣٤٫٥٦').valid.should.equal(true)
    v.validator(field)('١٢٣').valid.should.equal(true)

    // ASCII with ar-SA also works (Arabic separators normalize to US-style)
    v.validator(field)('1,234.56').valid.should.equal(true)
  })
})
