const translateShortText = data => {
  return { text: data.title }
}

//welcome_screen
const translateWelcomeScreen = (data, ref) => {
  const text = data.properties.button_text
  return makeMultipleChoice(data.title, [{ label: text }], ref)
}

const translateLongText = translateShortText
const translateNumber = translateShortText
const translateDate = translateShortText

const translateStatement = data => {
  const response = translateShortText(data)
  response.metadata = { type: 'statement' }
  return response
}

const translateThankYouScreen = data => {
  const title = data.title.split('\n')[0]
  const response = translateShortText({ title })
  response.metadata = { type: 'thankyou_screen' }
  return response
}

const makeMultipleChoice = (text, choices, ref) => {

  // let's try multiple elements??
  const response = { text }
  response.quick_replies = choices.map(choice => {
    const [title, value] = Array.isArray(choice) ? choice : [choice.label, choice.label]
    return {
      content_type: 'text',
      title: title,
      payload: JSON.stringify({ value, ref }),
    }
  })

  return response
}


const _makeSimpleChoice = (text, choices, ref) => {
  const response = {}
  const buttons = choices.map(choice => {
    // use choice.id for multiple choice??
    const [title, value] = Array.isArray(choice) ? choice : [choice.label, choice.label]

    return {
      type: 'postback',
      title: title,
      payload: JSON.stringify({ value: value, ref: ref }),
    }
  })
  response.attachment = {
    type: 'template',
    payload: {
      template_type: 'button',
      text: text,
      buttons,
    },
  }
  return response
}

//multiple_choice
const translateMultipleChoice = (data, ref) => {
  return makeMultipleChoice(data.title, data.properties.choices, ref)
}

const translateDropDown = translateMultipleChoice

// Button choice - like multiple_choice but uses button template with postback
// Limited to 3 buttons per Facebook API constraints
const MAX_BUTTON_CHOICES = 3

const translateButtonChoice = (data, ref) => {
  const choices = data.properties.choices

  if (choices.length > MAX_BUTTON_CHOICES) {
    throw new RangeError(
      `button_choice supports a maximum of ${MAX_BUTTON_CHOICES} buttons, ` +
      `but ${choices.length} were provided in field "${data.ref}". ` +
      `Use multiple_choice for more options.`
    )
  }

  return _makeSimpleChoice(data.title, choices, ref)
}

//yes_no to quick reply
const translateYesNo = (data, ref) => {
  return makeMultipleChoice(data.title, [{label: 'Yes'}, {label: 'No'}], ref)
}

const translateLegal = (data, ref) => {
  return makeMultipleChoice(data.title, [{label: 'I Accept'}, {label: "I don't Accept"}], ref)
}

//email to quick reply (fb has qr button for sending email assoc with account)
const translateEmail = data => {
  const response = translateShortText(data)
  response.quick_replies = [
    {
      content_type: 'user_email'
    },
  ]
  return response
}

const translatePhone = data => {
  const response = translateShortText(data)
  response.quick_replies = [
    {
      content_type: 'user_phone_number'
    },
  ]
  return response
}

const translateRatings = (data, ref) => {
  const start = data.properties.start_at_one === false ? 0 : 1
  const steps = data.properties.steps

  const choices = new Array(steps)
    .fill('*')
    .map((e, i) => ({ label: `${i + start}` }))

  return makeMultipleChoice(data.title, choices, ref)

}

//opinion scale to quick reply
const translateOpinionScale = translateRatings

//transform to carousel of generic templates
const translatePictureChoice = data => {
  const response = {}
  const elements = data.properties.choices.map(choice => {
    const buttons = [
      {
        type: 'postback',
        title: `select ${choice.label}`,
        payload: choice.label,
      },
    ]
    return {
      title: data.title,
      image_url: choice.attachment.href,
      buttons,
    }
  })
  response.attachment = {
    type: 'template',
    payload: {
      template_type: 'generic',
      elements,
    },
  }
  return response
}


function _shareButton(shareText, buttonText, url) {
  return {
    "type": "element_share",
    "share_contents": {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "generic",
          "elements": [
            {
              "title": shareText || "Take this survey",
              // "subtitle": "<TEMPLATE_SUBTITLE>",
              // "image_url": "<IMAGE_URL_TO_DISPLAY>",
              "default_action": {
                "type": "web_url",
                "url": url
              },
              "buttons": [
                {
                  "type": "web_url",
                  "url": url,
                  "title": buttonText || "Start"
                }
              ]
            }
          ]
        }
      }
    }
  }
}

const translateShare = (data) => {
  const { url, shareText, buttonText } = data.md

  const response = {
    "attachment": {
      "type": "template",
      "payload": {
        "template_type": "button",
        "text": data.title,
        "buttons": [_shareButton(shareText, buttonText, url)]
      }
    }
  }

  return response
}

const translateWait = translateShortText
const translateStitch = translateShortText
const translateUpload = translateShortText

const translateNotify = (data, ref) => {

  const response = {
    attachment: {
      type: "template",
      payload: {
        template_type: "one_time_notif_req",
        title: data.title,
        payload: JSON.stringify({ ref })
      }
    }
  }

  return response
}

const translateUtilityMessage = (data, ref) => {
  const md = data.md || {}
  const { template, language, params } = md

  if (!template) {
    throw new TypeError('utility_message field missing required "template" in its YAML description')
  }
  if (!language) {
    throw new TypeError('utility_message field missing required "language" in its YAML description')
  }

  const paramList = Array.isArray(params) ? params : []

  const components = [{
    type: 'body',
    parameters: paramList.map(text => ({ type: 'text', text: String(text) }))
  }]

  // Buttons come from the Typeform question's own `properties.choices` — this
  // is only meaningful on a `multiple_choice` question, where Typeform's
  // native logic editor already reads the same choices to drive branching.
  // Authors define the buttons once (on the multiple_choice question) and the
  // labels must match the approved template's button labels — the approved
  // template's baked-in payload (`{"value":"<label>","ref":"{{1}}"}`) is what
  // the user's tap returns. A statement-type utility_message with no choices
  // is fine for text-only templates.
  const choices = (data.properties && data.properties.choices) || []
  if (!Array.isArray(choices)) {
    throw new TypeError('utility_message: expected question.properties.choices to be an array')
  }
  choices.forEach((choice, index) => {
    components.push({
      type: 'button',
      sub_type: 'postback',
      index,
      parameters: [{ type: 'text', text: ref }]
    })
  })

  return {
    attachment: {
      type: 'template',
      payload: {
        template_type: 'utility_messages',
        name: template,
        language: { code: language },
        components
      }
    },
    metadata: {
      sendParams: { messaging_type: 'UTILITY' }
    }
  }
}

const translateNotificationMessages = (data, ref) => {
  const timezone = (data.md && data.md.timezone) || 'UTC'
  const ctaText = (data.md && data.md.ctaText) || 'ALLOW'

  const response = {
    attachment: {
      type: "template",
      payload: {
        template_type: "notification_messages",
        title: data.title,
        notification_messages_timezone: timezone,
        notification_messages_cta_text: ctaText,
        payload: JSON.stringify({ ref })
      }
    }
  }

  return response
}

const makeUrl = (url) => {
  if (typeof url === 'string') {
    return url
  }

  const { base, protocol = 'https', params = {} } = url

  if (!base) {
    throw new Error(`Invalid URL object for creating a URL: ${url}`)
  }

  const p = new URLSearchParams(params)
  const b = new URL(`${protocol}://${base}`)
  b.search = p.toString()
  return b.href
}

const translateWebview = (data) => {
  const { url, buttonText, extensions } = data.md

  const response = {
    "attachment": {
      "type": "template",
      "payload": {
        "template_type": "button",
        "text": data.title,
        "buttons": [
          {
            "type": "web_url",
            "url": makeUrl(url),
            "title": buttonText || "View website",
            "webview_height_ratio": "full",
            // default extensions to true
            "messenger_extensions": extensions === undefined ? true : extensions
          }
        ]
      }
    }
  }
  return response
}


const translateAttachment = (data) => {
  const { attachment } = data.md
  const { type, url, attachment_id } = attachment

  const payload = {}

  if (url) {
    payload['url'] = url
    payload['is_reusable'] = true
  }

  if (attachment_id) {
    payload['attachment_id'] = attachment_id
  }

  const response = {
    "attachment": {
      "type": type,
      "payload": payload
    }
  }
  return response
}




const lookup = {
  'short_text': translateShortText,
  'multiple_choice': translateMultipleChoice,
  'button_choice': translateButtonChoice,
  'email': translateEmail,
  'phone_number': translatePhone,
  'picture_choice': translatePictureChoice,
  'long_text': translateLongText,
  'welcome_screen': translateWelcomeScreen,
  'thankyou_screen': translateThankYouScreen,
  'legal': translateLegal,
  'yes_no': translateYesNo,
  'number': translateNumber,
  'statement': translateStatement,
  'opinion_scale': translateOpinionScale,
  'rating': translateRatings,
  'share': translateShare,
  'webview': translateWebview,
  'wait': translateWait,
  'stitch': translateStitch,
  'notify': translateNotify,
  'notification_messages': translateNotificationMessages,
  'utility_message': translateUtilityMessage,
  'attachment': translateAttachment,
  'upload': translateUpload,
}

function formatResponse(response) {
  const extraParams = response.metadata.sendParams || {}
  response.metadata = JSON.stringify(response.metadata)
  return { ...extraParams, message: response }
}

function translator(question) {
  const fn = lookup[question.type]
  if (!fn) {
    throw new TypeError(`There is no translator for the question of type ${question.type}`)
  }
  const response = fn(question, question.ref)
  // Include type in metadata for all field types to match Rust machine behavior
  response.metadata = { ...response.metadata, ...question.md, ref: question.ref, type: question.type }

  return formatResponse(response)
}

module.exports = {
  translator,
  translateWelcomeScreen,
  translateThankYouScreen,
  translateShortText,
  translateLongText,
  translateNumber,
  translateStatement,
  translateYesNo,
  translateMultipleChoice,
  translateButtonChoice,
  translateDropDown,
  translateEmail,
  translateOpinionScale,
  translateRatings,
  translatePictureChoice,
  translateDate,
  translateLegal,
  translateAttachment,
  translateUpload,
  translateNotify,
  translateNotificationMessages,
  translateUtilityMessage,
  makeUrl,
}
