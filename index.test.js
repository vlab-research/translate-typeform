const t = require('./index')

const _field = ({ref='foo', title='What do you think?', type='statement', properties={}}) => {
  return {id: ref, ref, title, properties, type}
}

describe('addCustomType', () => {

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
})
