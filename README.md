# translate-typeform

Translates Typeform forms to Facebook Messenger format.

## Number Fields with Locale

To support international number formats in number fields, add `locale` to the field description in YAML:

```yaml
locale: de-DE
```

Supported locales:
- `en-US` (default) - US format: `1,234.56`
- `de-DE` - European format: `1.234,56`
- `ar-SA` - Arabic Saudi: `١٬٢٣٤٫٥٦`
- `ar-MA` - Arabic Morocco: `1 234,56`

### Example Typeform Field Description

For a number field expecting European format input:
```yaml
locale: de-DE
```

The validator will then accept `1.234,56` as valid input and correctly parse it as `1234.56`.

## Number Parsing API

The `parseNumber(str, locale)` function parses numeric strings with locale-aware formatting.

### Usage

```javascript
const { parseNumber } = require('@vlab-research/translate-typeform')

parseNumber('1,234.56')           // 1234.56 (US format, default)
parseNumber('1.234,56', 'de-DE')  // 1234.56 (European format)
parseNumber('١٢٣', 'ar-SA')       // 123 (Arabic-Indic numerals)
```

### Supported Formats

| Locale | Thousands | Decimal | Example |
|--------|-----------|---------|---------|
| en-US (default) | `,` | `.` | `1,234.56` |
| de-DE | `.` | `,` | `1.234,56` |
| ar-SA | `٬` | `٫` | `١٬٢٣٤٫٥٦` |
| ar-MA | ` ` (space) | `,` | `1 234,56` |

### Unicode Numeral Support

Automatically normalizes digits from 30+ numeral systems:
- Arabic-Indic: `١٢٣` -> `123`
- Devanagari: `१२३` -> `123`
- Persian: `۱۲۳` -> `123`
- Bengali, Tamil, Thai, and many more

### Cross-Locale Behavior

**Important:** The locale determines how separators are interpreted. Mismatched locale and input format will produce incorrect results.

#### Works: ar-SA locale with US-style ASCII input
```javascript
parseNumber('100.50', 'ar-SA')    // 100.5 (correct)
parseNumber('1,234.56', 'ar-SA')  // 1234.56 (correct)
```
This works because ar-SA separators (`٬` thousands, `٫` decimal) normalize to the same ASCII characters as US format (`,` and `.`).

#### Works: Default locale with Arabic script input
```javascript
parseNumber('١٠٠.٥٠')        // 100.5 (correct)
parseNumber('١٬٢٣٤٫٥٦')      // 1234.56 (correct)
```
This works because Arabic digits and separators normalize to US-style ASCII.

#### Broken: ar-MA locale with US-style input
```javascript
parseNumber('100.50', 'ar-MA')    // 10050 (wrong!)
parseNumber('1,234.56', 'ar-MA')  // 1.23456 (wrong!)
```
ar-MA uses European-style formatting (comma=decimal, space=thousands). When given US-style input (dot=decimal, comma=thousands), the parser misinterprets the separators.

**Rule:** Always ensure the input format matches the specified locale.

### Returns

- `number` - The parsed numeric value
- `null` - If parsing fails (invalid input, letters, etc.)
