const t = require('./index')

const _field = ({ref='foo', title='What do you think?', type='statement', properties={}}) => {
  return {id: ref, ref, title, properties, type}
}

describe.only('addCustomType', () => {

  it('does nothing if no description', () => {
    const field = _field({
      properties: {description: ''}
    })
    const res = t.addCustomType(field)
    res.should.eql(field)
  })


  it('ignores descriptions that arent json or yaml', () => {
    let field = _field({
      properties: {description: 'hello'}
    })
    let res = t.addCustomType(field)
    res.should.eql(field)

    field = _field({
      properties: {description: '123'}
    })
    res = t.addCustomType(field)
    res.should.eql(field)
  })

  it('adds md to field', () => {

    const field = _field({
      type: 'statement',
      properties: {description: '{"otherKey": "otherValue"}'}
    })
    const res = t.addCustomType(field)

    res.md.otherKey.should.equal("otherValue")
    res.type.should.equal('statement')
  })

  it('adds overwrites type if type exists to field', () => {

    const field = _field({
      properties: {description: '{"type": "baz"}'}
    })
    const res = t.addCustomType(field)

    res.type.should.equal('baz')
  })


  it('removes weird underscore escaping of typeform', () => {

    const field = _field({
      type: 'statement',
      properties: {description: '{"otherKey": "other\\_value"}'}
    })
    const res = t.addCustomType(field)

    res.md.otherKey.should.equal("other_value")
  })


  it('removes markdown urls in description as well', () => {
    const field = _field({
      type: 'statement',
      properties: {description: '{"otherKey": "[https://foo.com](https://foo.com)"}'}
    })

    const res = t.addCustomType(field)

    res.md.otherKey.should.equal("https://foo.com")
  })


  it('allows brackets and paranthesis though', () => {
    const field = _field({
      properties: {description: '{"foo": "hello [thats fine] ok is that (ok?)"}'}
    })
    const res = t.addCustomType(field)
    res.md.foo.should.equal("hello [thats fine] ok is that (ok?)")
  })

})