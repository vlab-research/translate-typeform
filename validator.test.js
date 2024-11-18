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
})
