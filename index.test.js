const t = require('./index')

const _field = ({ ref = 'foo', title = 'What do you think?', type = 'statement', properties = {} }) => {
  return { id: ref, ref, title, properties, type }
}

describe('addCustomType', () => {

  it('does nothing if no description', () => {
    const field = _field({
      properties: { description: '' }
    })
    const res = t.addCustomType(field)
    res.should.eql(field)
  })


  it('ignores descriptions that arent json or yaml', () => {
    let field = _field({
      properties: { description: 'hello' }
    })
    let res = t.addCustomType(field)
    res.should.eql(field)

    field = _field({
      properties: { description: '123' }
    })
    res = t.addCustomType(field)
    res.should.eql(field)
  })

  it('adds md to field', () => {
    const field = _field({
      type: 'statement',
      properties: { description: '{"otherKey": "otherValue"}' }
    })
    field.md = { foo: 'bar' }

    const res = t.addCustomType(field)

    res.md.otherKey.should.equal("otherValue")
    res.type.should.equal('statement')

    // keeps existing md
    res.md.foo.should.equal('bar')
  })


  it('adds overwrites type if type exists to field', () => {

    const field = _field({
      properties: { description: '{"type": "baz"}' }
    })
    field.md = { foo: 'bar' }
    const res = t.addCustomType(field)

    res.type.should.equal('baz')

    // keeps existing md
    res.md.foo.should.equal('bar')
  })

  it('removes markdown urls in description', () => {
    const field = _field({
      type: 'statement',
      properties: { description: '{"otherKey": "[https://foo.com](https://foo.com)"}' }
    })

    const res = t.addCustomType(field)

    res.md.otherKey.should.equal("https://foo.com")
  })


  it('removes markdown urls in complex, nested description', () => {
    const field = _field({
      type: 'statement',
      properties: { description: '{"foo": "bar", "baz": 1, "otherKey": {"qux": "[https://foo.com](https://foo.com)"}}' }
    })

    const res = t.addCustomType(field)

    res.md.otherKey.qux.should.equal("https://foo.com")
    res.md.baz.should.equal(1)
  })

  it('removes markdown urls in reallife scenario', () => {
    const description = "{\n \"type\": \"webview\",\n \"url\": {\n \"base\": \"[https://columbiangwu.co1.qualtrics.com/jfe/form/SV\\_8k7acmuWQAZjERE](https://columbiangwu.co1.qualtrics.com/jfe/form/SV_8k7acmuWQAZjERE)\",\n \"params\": {\n \"vlab\\_id\": \"{{hidden:id}}\"\n }\n },\n \"buttonText\": \"Start\",\n \"extensions\": false\n}"

    const field = _field({
      type: 'statement',
      properties: { description }
    })


    const res = t.addCustomType(field)
    res.md.url.base.should.equal("https://columbiangwu.co1.qualtrics.com/jfe/form/SV_8k7acmuWQAZjERE")
  })


  it('allows brackets and paranthesis though', () => {
    const field = _field({
      properties: { description: '{"foo": "hello [thats fine] ok is that (ok?)"}' }
    })
    const res = t.addCustomType(field)
    res.md.foo.should.equal("hello [thats fine] ok is that (ok?)")
  })


  it('allows urls to pass through untouched', () => {
    const field = _field({
      type: 'statement',
      properties: { description: "type: webview\nurl: https://gbvlinks.nandan.cloud?url=populationfoundation.in&id=\nbuttonText: Visit Population Foundation\nresponseMessage: Click on the button to visit the website\nextensions: false\nkeepMoving: true" }
    })

    const res = t.addCustomType(field)

    res.md.url.should.equal("https://gbvlinks.nandan.cloud?url=populationfoundation.in&id=")
  })
})
