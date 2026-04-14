const mocha = require('mocha')
const chai = require('chai').should()
const mocks = require('./mocks/typeform-form')

const translateFunctions = require('./translate-fields')

describe('should translate the welcome screen', () => {
  const data = mocks.welcome_screens[0]
  const translated = translateFunctions.translateWelcomeScreen(data)

  it('should have a text property with the title of the welcome screen', () => {
    translated.should.have.property('text', data.title)
  })
  it('should have a quick_replies property of type array', () => {
    translated.quick_replies.should.be.an('array')
  })
  it('quick_replies should have one element in it', () => {
    translated.quick_replies.should.have.length(1)
  })
  it('quick_replies should contain objects with properties of content_type, title and payload', () => {
    translated.quick_replies.forEach(reply => {
      reply.should.have.property('content_type', 'text')
      reply.should.have.property('title')
      reply.should.have.property('payload', `{"value":"${data.properties.button_text}"}`)
    })
  })
})

describe('translateShare', () => {
  it('associates url, text, and buttonText', () => {
    // TODO: test!
  })
})

describe('should translate short text questions', () => {
  const shortTextQuestion = mocks.fields.filter(question => {
    return question.type === 'short_text'
  })[0]

  const question = translateFunctions.translateShortText(shortTextQuestion)

  it('should have a text property that is the Typeform question', () => {
    question.should.have.property('text', shortTextQuestion.title)
  })
})

describe('should translate statement', () => {
  const statement = mocks.fields.filter(question => {
    return question.type === 'statement'
  })[0]

  const translated = translateFunctions.translateStatement(statement)

  it('should have a text property with the title of the statement', () => {
    translated.should.have.property('text', statement.title)
  })

  it('should have metadata with type statement', () => {
    translated.metadata.should.have.property('type', 'statement')
  })
})

describe('should translate long_text questions', () => {
  const longTextQuestion = mocks.fields.filter(question => {
    return question.type === 'long_text'
  })[0]

  const question = translateFunctions.translateLongText(longTextQuestion)

  it('should have a text property that is the Typeform question', () => {
    question.should.have.property('text', longTextQuestion.title)
  })
})

describe('yes_no questions', () => {
  const yesNoQuestion = mocks.fields.filter(question => {
    return question.type === 'yes_no'
  })[0]

  const { message: translated } = translateFunctions.translator(yesNoQuestion)

  it('should have a text property with the title of the questions', () => {
    translated.should.have.property('text', yesNoQuestion.title)
  })

  it('The options given by quick_replies should be a "yes" and "no"', () => {
    translated.quick_replies[0].title.should.equal('Yes')
    translated.quick_replies[1].title.should.equal('No')
  })

  it('The payload given by quick_replies should contain value and ref', () => {
    JSON.parse(translated.quick_replies[0].payload).value.should.equal('Yes')
    JSON.parse(translated.quick_replies[1].payload).value.should.equal('No')
    JSON.parse(translated.quick_replies[0].payload).ref.should.equal(yesNoQuestion.ref)
  })
})

describe('should translate multiple choice questions', () => {

  const multipleChoiceQuestion = mocks.fields.filter(question => {
    return question.type === 'multiple_choice'
  })[0]

  const { message: translated } = translateFunctions.translator(multipleChoiceQuestion)

  it('should have a text property with the title of the questions', () => {
    translated.should.have.property('text', multipleChoiceQuestion.title)
  })
  it('quick_replies should be an array with 3 elements in it', () => {
    translated.quick_replies.should.be.an('array')
    translated.quick_replies.should.have.length(3)
  })
  it('quick_replies should have "content-type", "title", "payload" properties', () => {
    translated.quick_replies.every(reply => {
      if (reply.content_type && reply.title && reply.payload) {
        return true
      }
    }).should.equal(true)
  })
  it('quick_replies should have the proper payload and titles', () => {
    const values = translated.quick_replies.map(r => JSON.parse(r.payload)).map(r => r.value)
    values.should.deep.equal(['Commander', 'Astro-biologist', 'Engineer'])
    const titles = translated.quick_replies.map(r => r.title)
    titles.should.deep.equal(['Commander', 'Astro-biologist', 'Engineer'])
  })
})

describe('should translate button_choice questions', () => {
  // button_choice uses button template with postback instead of quick_replies
  // Limited to 3 buttons per Facebook API constraints
  const buttonChoiceQuestion = {
    id: 'test-button-choice',
    title: 'Pick your favorite',
    ref: 'button-choice-ref',
    type: 'button_choice',
    properties: {
      choices: [
        { id: '1', ref: 'a', label: 'Option A' },
        { id: '2', ref: 'b', label: 'Option B' },
        { id: '3', ref: 'c', label: 'Option C' }
      ]
    }
  }

  const { message: translated } = translateFunctions.translator(buttonChoiceQuestion)

  it('should have an attachment property', () => {
    translated.should.have.property('attachment')
  })

  it('attachment should have type template', () => {
    translated.attachment.should.have.property('type', 'template')
  })

  it('payload should have template_type button', () => {
    translated.attachment.payload.should.have.property('template_type', 'button')
  })

  it('payload should have text with the question title', () => {
    translated.attachment.payload.should.have.property('text', buttonChoiceQuestion.title)
  })

  it('buttons should be an array with 3 elements', () => {
    translated.attachment.payload.buttons.should.be.an('array')
    translated.attachment.payload.buttons.should.have.length(3)
  })

  it('each button should have type postback', () => {
    translated.attachment.payload.buttons.forEach(button => {
      button.should.have.property('type', 'postback')
    })
  })

  it('buttons should have proper titles and payloads', () => {
    const buttons = translated.attachment.payload.buttons
    buttons[0].title.should.equal('Option A')
    buttons[1].title.should.equal('Option B')
    buttons[2].title.should.equal('Option C')

    JSON.parse(buttons[0].payload).value.should.equal('Option A')
    JSON.parse(buttons[0].payload).ref.should.equal('button-choice-ref')
    JSON.parse(buttons[1].payload).value.should.equal('Option B')
    JSON.parse(buttons[2].payload).value.should.equal('Option C')
  })

  it('should throw RangeError when more than 3 choices provided', () => {
    const tooManyChoices = {
      id: 'test',
      title: 'Too many options',
      ref: 'too-many-ref',
      type: 'button_choice',
      properties: {
        choices: [
          { id: '1', ref: 'a', label: 'A' },
          { id: '2', ref: 'b', label: 'B' },
          { id: '3', ref: 'c', label: 'C' },
          { id: '4', ref: 'd', label: 'D' }
        ]
      }
    }

    translateFunctions.translator.bind(null, tooManyChoices).should.throw(RangeError)
  })

  it('should work with 1 or 2 choices', () => {
    const twoChoices = {
      id: 'test',
      title: 'Two options',
      ref: 'two-ref',
      type: 'button_choice',
      properties: {
        choices: [
          { id: '1', ref: 'a', label: 'Yes' },
          { id: '2', ref: 'b', label: 'No' }
        ]
      }
    }

    const { message } = translateFunctions.translator(twoChoices)
    message.attachment.payload.buttons.should.have.length(2)
  })
})

describe('should translate questions that use an opinion scale', () => {
  const opinionScaleQuestion = mocks.fields.filter(question => {
    return question.type === 'opinion_scale'
  })[0]

  const translated = translateFunctions.translateOpinionScale(opinionScaleQuestion, 'foo')

  it('should have a text property with the title of the questions', () => {
    translated.should.have.property('text', opinionScaleQuestion.title)
  })

  it('quick_replies should have number of elements equal to steps', () => {
    translated.quick_replies.should.be.an('array')
    translated.quick_replies.should.have.length(opinionScaleQuestion.properties.steps)
  })


  it('quick_replies payload property should return the score and ref', () => {
    for (let [index, el] of translated.quick_replies.entries()) {
      JSON.parse(el.payload).value.should.equal('' + (index + 1))
      JSON.parse(el.payload).ref.should.equal('foo')
      el.title.should.equal('' + (index + 1))
      el.content_type.should.equal('text')
    }
  })

  it('quick_replies payload property should listen to start_at_one', () => {
    const translated = translateFunctions.translateOpinionScale({
      ...opinionScaleQuestion,
      properties: { steps: 5, start_at_one: false }
    })

    for (let [index, el] of translated.quick_replies.entries()) {
      JSON.parse(el.payload).value.should.equal('' + (index))
      el.title.should.equal('' + (index))
      el.content_type.should.equal('text')
    }
  })

  it('quick_replies payload property should default to 1 if start_at_one is undefined (translateRating)', () => {
    const translated = translateFunctions.translateRatings({
      ...opinionScaleQuestion,
      properties: { steps: 5, start_at_one: undefined }
    })

    for (let [index, el] of translated.quick_replies.entries()) {
      JSON.parse(el.payload).value.should.equal('' + (index + 1))
      el.title.should.equal('' + (index + 1))
      el.content_type.should.equal('text')
    }
  })
})

describe('should translate questions asking for email', () => {
  const emailQuestion = mocks.fields.filter(question => {
    return question.type === 'email'
  })[0]

  const translated = translateFunctions.translateEmail(emailQuestion)

  it('should have a text property with the title of the questions', () => {
    translated.should.have.property('text', emailQuestion.title)
  })
  it('should have a quick_replies property of type array', () => {
    translated.quick_replies.should.be.an('array')
  })
  it('quick_replies should have one element in it', () => {
    translated.quick_replies.should.have.length(1)
  })
  it('quick_reply should be an object with property "content_type" of "user_email"', () => {
    translated.quick_replies[0].should.have.property('content_type', 'user_email')
  })
  it('quick_reply should not have property "payload"', () => {
    translated.quick_replies[0].should.not.have.property('payload')
  })
})

describe('should translate questions with choices accompanied by pictures', () => {
  const pictureChoiceQuestion = mocks.fields.filter(question => {
    return question.type === 'picture_choice'
  })[0]

  const translated = translateFunctions.translatePictureChoice(pictureChoiceQuestion)

  it('should have an attachment property', () => {
    translated.should.have.property('attachment')
  })

  const attachment = translated.attachment

  it('attachment should have property type set to template', () => {
    attachment.should.have.property('type', 'template')
  })
  it('attachment should have payload property', () => {
    attachment.should.have.property('payload')
  })
  it('payload should have template type set to generic', () => {
    attachment.payload.should.have.property('template_type', 'generic')
  })
  it('payload should have an elements array equal to length of choices', () => {
    attachment.payload.elements.should.have.length(pictureChoiceQuestion.properties.choices.length)
  })

  const fbElements = attachment.payload.elements
  const tfChoices = pictureChoiceQuestion.properties.choices

  it('each element should have a title property', () => {
    fbElements.forEach(el => el.should.have.property('title', pictureChoiceQuestion.title))
  })

  it('each element should have a button array with one element', () => {
    fbElements.forEach(el => el.buttons.should.have.length(1))
  })

  it('each element should have a image_url property', () => {
    for (let [index, el] of fbElements.entries()) {
      el.image_url.should.equal(tfChoices[index].attachment.href)
    }
  })

  it('each button should be type of postback', () => {
    fbElements.forEach(el => {
      el.buttons.forEach(button => button.should.have.property('type', 'postback'))
    })
  })

  it('each button should have a title equal to the choice label', () => {
    for (let [index, el] of fbElements.entries()) {
      el.buttons[0].should.have.property('title', `select ${tfChoices[index].label}`)
    }
  })

  it('each button should have a payload', () => {
    for (let [index, el] of fbElements.entries()) {
      el.buttons[0].should.have.property('payload', tfChoices[index].label)
    }
  })
})

describe('translateAttachment', () => {
  const fn = translateFunctions.translateAttachment

  it('works for url', () => {
    const res = fn({ md: { attachment: { type: 'image', url: 'foo' } } })

    res.attachment.type.should.equal('image')
    res.attachment.payload.url.should.equal('foo')
  })


  it('works for attachment_id', () => {
    const res = fn({ md: { attachment: { type: 'image', attachment_id: 'foo' } } })

    res.attachment.type.should.equal('image')
    res.attachment.payload.attachment_id.should.equal('foo')
  })

})

describe('makeUrl', () => {
  it('does nothing when given a string to support legacy format', () => {
    translateFunctions.makeUrl('foo').should.equal('foo')
  })

  it('throws an error when missing base', () => {
    translateFunctions.makeUrl.bind(null, {}).should.throw('Invalid URL')
  })

  it('makes a url without any query params', () => {
    translateFunctions.makeUrl({ base: 'foo.com/bar' }).should.equal('https://foo.com/bar')
  })

  it('makes a url with any query params', () => {
    translateFunctions
      .makeUrl({ base: 'foo.com/bar', params: { 'baz': 'https://qux.com?fast=cars', 'id': 123 } })
      .should.equal('https://foo.com/bar?baz=https%3A%2F%2Fqux.com%3Ffast%3Dcars&id=123')
  })
})

describe('should translate notification_messages field', () => {
  const notificationMessagesQuestion = {
    id: 'test-notification-messages',
    title: 'Enable Marketing Messages',
    ref: 'notification-messages-ref',
    type: 'notification_messages',
    properties: {},
    md: { timezone: 'America/New_York', ctaText: 'GET_UPDATES' }
  }

  const { message: translated } = translateFunctions.translator(notificationMessagesQuestion)

  it('should have an attachment property', () => {
    translated.should.have.property('attachment')
  })

  it('attachment should have type template', () => {
    translated.attachment.should.have.property('type', 'template')
  })

  it('payload should have template_type notification_messages', () => {
    translated.attachment.payload.should.have.property('template_type', 'notification_messages')
  })

  it('payload should have title with the question title', () => {
    translated.attachment.payload.should.have.property('title', notificationMessagesQuestion.title)
  })

  it('payload should have notification_messages_timezone with the specified timezone', () => {
    translated.attachment.payload.should.have.property('notification_messages_timezone', 'America/New_York')
  })

  it('payload should have notification_messages_cta_text with the specified CTA', () => {
    translated.attachment.payload.should.have.property('notification_messages_cta_text', 'GET_UPDATES')
  })

  it('payload should have the ref encoded in JSON stringify format', () => {
    JSON.parse(translated.attachment.payload.payload).ref.should.equal('notification-messages-ref')
  })

  it('should default timezone to UTC if not specified', () => {
    const noTimezoneQuestion = {
      ...notificationMessagesQuestion,
      md: { ctaText: 'ALLOW' }
    }

    const { message } = translateFunctions.translator(noTimezoneQuestion)
    message.attachment.payload.should.have.property('notification_messages_timezone', 'UTC')
  })

  it('should default ctaText to ALLOW if not specified', () => {
    const noCtaQuestion = {
      ...notificationMessagesQuestion,
      md: { timezone: 'Europe/London' }
    }

    const { message } = translateFunctions.translator(noCtaQuestion)
    message.attachment.payload.should.have.property('notification_messages_cta_text', 'ALLOW')
  })

  it('should default both timezone and ctaText if no md provided', () => {
    const noMdQuestion = {
      ...notificationMessagesQuestion,
      md: {}
    }

    const { message } = translateFunctions.translator(noMdQuestion)
    message.attachment.payload.should.have.property('notification_messages_timezone', 'UTC')
    message.attachment.payload.should.have.property('notification_messages_cta_text', 'ALLOW')
  })
})

describe('translator', () => {
  const { translator } = translateFunctions

  it('adds sendParameters when declared in the question', () => {

    const res = translator({
      type: 'multiple_choice',
      title: 'Do you want to continue?',
      properties: { choices: [] },
      md: { sendParams: { tag: 'TAG_ONE', messaging_type: 'MESSAGE_TAG' } }
    })

    res.tag.should.equal('TAG_ONE')
    res.messaging_type.should.equal('MESSAGE_TAG')
  })
})
