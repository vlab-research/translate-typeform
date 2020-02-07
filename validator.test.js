const mocha = require('mocha')
const chai = require('chai').should()
const mocks = require('./mocks/typeform-form')

const v = require('./validator')

describe('validator', () => {
  it('should validate statement with custom reponseMessage', () => {
    const field = {type: 'statement', title: 'foo', ref: 'foo', md: {responseMessage: 'foobarbaz'}}
    const res = v.validator(field)({ foo: 'bar'})
    res.message.should.equal('foobarbaz')
  })

  it('should validate when not a mobile', () => {
  const field = {type: 'phone_number', title: 'foo', ref: 'foo', md: {validate: { country: 'IN', mobile: true}}}

  const res = v.validator(field)({ foo: 'bar'})

  res.message.should.equal('Sorry, please enter a valid mobile number.')
  })

  it.only('should validate when not a phone number', () => {
    const field = {type: 'phone_number', title: 'foo', ref: 'foo', md: {validate: { country: 'IN', mobile: false}}}

    const res = v.validator(field)('9999')
    res.message.should.equal('Sorry, please enter a valid phone number.')
  })

  it('should validate when a mobile number', () => {
    const field = {type: 'phone_number', title: 'foo', ref: 'foo', md: {validate: { country: 'IN', mobile: true}}}

    const res = v.validator(field)('+918888000000')
    res.valid.should.equal(true)
  })
})
