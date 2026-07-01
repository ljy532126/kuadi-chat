const HELP_KEYWORDS = ['帮助', 'help', '怎么', '如何', '什么', '?', '？', '使用']

// Track a tracking number from anywhere in the text
function findTrackingNumber(text) {
  const cleaned = text
    .replace(/快递单号[：:]\s*/g, ' ')
    .replace(/运单号[：:]\s*/g, ' ')
    .replace(/,/g, ' ')
    .replace(/，/g, ' ')
    .trim()

  // Match: 2-4 letters + 8-18 digits (e.g. JT3168447474853, SF1234567890123)
  // or pure digits 10-20 (e.g. 777422417791832)
  const match = cleaned.match(/(?:[a-zA-Z]{2,4}\d{8,18}|\d{10,20})/)
  return match ? match[0] : null
}

export function parseInput(text) {
  const trimmed = text.trim()
  if (!trimmed) return null

  const lower = trimmed.toLowerCase()
  if (HELP_KEYWORDS.some(k => lower.includes(k))) {
    return { type: 'help' }
  }

  // Extract tracking number from anywhere in the text
  const tracking_number = findTrackingNumber(trimmed)
  if (tracking_number) {
    // Also extract phone suffix (4 digits) if present
    let phone = ''
    const phoneMatch = trimmed.match(/\b\d{4}\b/)
    if (phoneMatch) {
      const num = phoneMatch[0]
      // Don't treat it as phone if it's part of the tracking number
      if (!tracking_number.includes(num) || tracking_number.indexOf(num) > tracking_number.length - 4) {
        phone = num
      }
    }
    return { type: 'query', tracking_number, carrier_code: '', phone }
  }

  return { type: 'invalid', text: trimmed }
}
