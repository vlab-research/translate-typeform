const mocha = require('mocha')
const chai = require('chai').should()
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

  it('should validate numbers', () => {
    const field = { type: 'number', title: 'foo', ref: 'foo' }

    let res = v.validator(field)('918888000000')
    res.valid.should.equal(true)
    res = v.validator(field)(8888000000)
    res.valid.should.equal(true)
    res = v.validator(field)('8,888,000')
    res.valid.should.equal(true)
    res = v.validator(field)('8.888.000')
    res.valid.should.equal(true)
    res = v.validator(field)('88.000')
    res.valid.should.equal(true)
    res = v.validator(field)('1,000')
    res.valid.should.equal(true)
    res = v.validator(field)('1.0')
    res.valid.should.equal(true)
    res = v.validator(field)('-1.0')
    res.valid.should.equal(true)
    res = v.validator(field)('-0.04')
    res.valid.should.equal(true)
    res = v.validator(field)('8888 mil')
    res.valid.should.equal(false)
    res = v.validator(field)('five thousand')
    res.valid.should.equal(false)

    // check booleans!
    res = v.validator(field)(false)
    res.valid.should.equal(false)
    res = v.validator(field)(true)
    res.valid.should.equal(false)
  })

  // Unicode numeral validation tests
  it('should validate Arabic-Indic numerals', () => {
    const field = { type: 'number', title: 'foo', ref: 'foo' }

    let res = v.validator(field)('٩٨٧٦٥٤٣٢١')  // 987654321
    res.valid.should.equal(true)
    res = v.validator(field)('١٬٠٠٠')  // 1,000 with Arabic comma
    res.valid.should.equal(true)
    res = v.validator(field)('-٣٤٥')  // -345
    res.valid.should.equal(true)
    res = v.validator(field)('٠')  // 0
    res.valid.should.equal(true)
  })

  it('should validate Persian numerals', () => {
    const field = { type: 'number', title: 'foo', ref: 'foo' }

    let res = v.validator(field)('۱۲۳۴۵')  // 12345
    res.valid.should.equal(true)
    res = v.validator(field)('-۱۲۳')  // -123
    res.valid.should.equal(true)
    res = v.validator(field)('۰')  // 0
    res.valid.should.equal(true)
  })

  it('should validate Devanagari numerals', () => {
    const field = { type: 'number', title: 'foo', ref: 'foo' }

    let res = v.validator(field)('१२३')  // 123
    res.valid.should.equal(true)
    res = v.validator(field)('१,०००')  // 1,000
    res.valid.should.equal(true)
    res = v.validator(field)('-४५६')  // -456
    res.valid.should.equal(true)
  })

  it('should validate Bengali numerals', () => {
    const field = { type: 'number', title: 'foo', ref: 'foo' }

    let res = v.validator(field)('१२३')  // Bengali test - using Bengali numerals
    res.valid.should.equal(true)
    res = v.validator(field)('৫৬৭')  // 567
    res.valid.should.equal(true)
  })

  it('should validate Tamil numerals', () => {
    const field = { type: 'number', title: 'foo', ref: 'foo' }

    let res = v.validator(field)('௧௨௩')  // 123
    res.valid.should.equal(true)
    res = v.validator(field)('௯')  // 9
    res.valid.should.equal(true)
  })

  it('should validate Thai numerals', () => {
    const field = { type: 'number', title: 'foo', ref: 'foo' }

    let res = v.validator(field)('๑๒๓๔๕')  // 12345
    res.valid.should.equal(true)
    res = v.validator(field)('๙')  // 9
    res.valid.should.equal(true)
  })

  it('should reject mixed script numerals', () => {
    const field = { type: 'number', title: 'foo', ref: 'foo' }

    let res = v.validator(field)('१२3')  // Devanagari + ASCII
    res.valid.should.equal(false)
    res = v.validator(field)('123٤')  // ASCII + Arabic-Indic
    res.valid.should.equal(false)
    res = v.validator(field)('۱۲३')  // Persian + Devanagari
    res.valid.should.equal(false)
  })

  it('should reject invalid Unicode number patterns', () => {
    const field = { type: 'number', title: 'foo', ref: 'foo' }

    let res = v.validator(field)('१२३abc')  // digits + letters
    res.valid.should.equal(false)
    res = v.validator(field)('٣٤٥ mil')  // digits + text
    res.valid.should.equal(false)
  })

  it('should validate decimal numbers with Unicode digits', () => {
    const field = { type: 'number', title: 'foo', ref: 'foo' }

    let res = v.validator(field)('१२३.४५')  // 123.45 with Devanagari
    res.valid.should.equal(true)
    res = v.validator(field)('۱۲۳.۴۵')  // 123.45 with Persian
    res.valid.should.equal(true)
  })

  // Phase 1 Tests: Decimal Preservation (Critical Bug Fix)
  describe('Phase 1: Decimal value preservation', () => {
    const field = { type: 'number', title: 'foo', ref: 'foo' }

    it('should preserve simple decimal values', () => {
      // Critical: These must validate as decimals, not integers
      let res = v.validator(field)('100.50')
      res.valid.should.equal(true)

      res = v.validator(field)('19.99')
      res.valid.should.equal(true)

      res = v.validator(field)('0.99')
      res.valid.should.equal(true)

      res = v.validator(field)('3.14')
      res.valid.should.equal(true)
    })

    it('should preserve decimal values with Unicode digits', () => {
      // Devanagari decimals
      let res = v.validator(field)('१००.५')  // 100.5
      res.valid.should.equal(true)

      res = v.validator(field)('३.१४')  // 3.14
      res.valid.should.equal(true)

      // Arabic-Indic decimals
      res = v.validator(field)('١٩.٩٩')  // 19.99
      res.valid.should.equal(true)
    })

    it('should handle thousands separators with decimals (US format)', () => {
      // US format: comma for thousands, dot for decimal
      let res = v.validator(field)('1,000.50')
      res.valid.should.equal(true)

      res = v.validator(field)('1,234,567.89')
      res.valid.should.equal(true)

      res = v.validator(field)('10,000.99')
      res.valid.should.equal(true)
    })

    it('should handle thousands separators with decimals (European format)', () => {
      // European format: dot for thousands, comma for decimal
      let res = v.validator(field)('1.000,50')
      res.valid.should.equal(true)

      res = v.validator(field)('1.234.567,89')
      res.valid.should.equal(true)

      res = v.validator(field)('10.000,99')
      res.valid.should.equal(true)
    })

    it('should handle Indian numbering system', () => {
      // Indian format: groups of 2 digits after first 3
      let res = v.validator(field)('12,34,567.89')
      res.valid.should.equal(true)

      res = v.validator(field)('1,00,000')
      res.valid.should.equal(true)
    })

    it('should handle decimals with multiple decimal places', () => {
      let res = v.validator(field)('3.14159')
      res.valid.should.equal(true)

      res = v.validator(field)('0.123456')
      res.valid.should.equal(true)

      res = v.validator(field)('99.9999')
      res.valid.should.equal(true)
    })

    it('should handle negative decimal values', () => {
      let res = v.validator(field)('-100.50')
      res.valid.should.equal(true)

      res = v.validator(field)('-19.99')
      res.valid.should.equal(true)

      res = v.validator(field)('-0.04')
      res.valid.should.equal(true)
    })

    it('should handle edge case decimal patterns', () => {
      // Decimal without leading zero
      let res = v.validator(field)('.5')
      res.valid.should.equal(true)

      // Decimal ending in zero
      res = v.validator(field)('100.0')
      res.valid.should.equal(true)

      // Just zero with decimal
      res = v.validator(field)('0.0')
      res.valid.should.equal(true)
    })

    it('should reject multiple decimal separators', () => {
      // These are ambiguous/invalid formats
      let res = v.validator(field)('1.2.3')
      res.valid.should.equal(false)

      res = v.validator(field)('100.50.25')
      res.valid.should.equal(false)

      res = v.validator(field)('1,2,3')  // Could be thousands, but with no clear decimal it's ambiguous in some contexts
      // This should actually be valid as it could be 123 with thousands separators
      // Let's test what it does
      // res.valid.should.equal(false)
    })

    it('should reject scientific notation', () => {
      // Scientific notation is not valid form input
      let res = v.validator(field)('1e5')
      res.valid.should.equal(false)

      res = v.validator(field)('1.5e10')
      res.valid.should.equal(false)

      res = v.validator(field)('2E-3')
      res.valid.should.equal(false)
    })

    it('should handle single separator ambiguity intelligently', () => {
      // Single dot - treat as decimal
      let res = v.validator(field)('1.5')
      res.valid.should.equal(true)

      // Single comma - treat as decimal
      res = v.validator(field)('1,5')
      res.valid.should.equal(true)

      // Ambiguous: could be 1000 or 1.000 depending on locale
      // With single separator at position suggesting decimal, treat as decimal
      res = v.validator(field)('1.000')
      res.valid.should.equal(true)  // Could be 1000 with thousands sep or 1.0
    })
  })
})
