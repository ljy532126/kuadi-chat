const HELP_KEYWORDS = ['帮助', 'help', '怎么', '如何', '什么', '?', '？', '使用']

export function parseInput(text) {
  const trimmed = text.trim()
  if (!trimmed) return null

  // Check if user is asking for help
  const lower = trimmed.toLowerCase()
  if (HELP_KEYWORDS.some(k => lower.includes(k))) {
    return { type: 'help' }
  }

  const parts = trimmed.split(/\s+/)
  const first = parts[0]
  let tracking_number = ''
  let carrier_code = ''
  let phone = ''

  if (first.length >= 8 && /^[a-zA-Z0-9]+$/.test(first)) {
    // Looks like a valid tracking number
    tracking_number = first
    if (parts.length === 2) {
      if (/^\d{4}$/.test(parts[1])) {
        phone = parts[1]
      } else {
        carrier_code = parts[1]
      }
    } else if (parts.length >= 3) {
      carrier_code = parts[1]
      const last = parts[parts.length - 1]
      if (/^\d{4}$/.test(last)) phone = last
      else if (parts.length > 3) carrier_code = parts.slice(1).join(' ')
    }
    return { type: 'query', tracking_number, carrier_code, phone }
  }

  // Unrecognized — not a valid tracking number
  return { type: 'invalid', text: trimmed, reason: first.length < 8 ? 'too_short' : 'bad_format' }
}
