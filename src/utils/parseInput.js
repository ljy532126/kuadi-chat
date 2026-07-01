const HELP_KEYWORDS = ['帮助', 'help', '怎么', '如何', '什么', '?', '？', '使用']

const CARRIER_ALIASES = {
  '极兔': 'jtexpress', '极兔速递': 'jtexpress', 'jtexpress': 'jtexpress', 'jt': 'jtexpress',
  '顺丰': 'shunfeng', '顺丰速运': 'shunfeng', 'sf': 'shunfeng', 'shunfeng': 'shunfeng',
  '圆通': 'yuantong', '圆通速递': 'yuantong', 'yt': 'yuantong', 'yuantong': 'yuantong',
  '中通': 'zhongtong', '中通快递': 'zhongtong', 'zt': 'zhongtong', 'zhongtong': 'zhongtong',
  '申通': 'shentong', '申通快递': 'shentong', 'st': 'shentong', 'shentong': 'shentong',
  '韵达': 'yunda', '韵达快递': 'yunda', 'yd': 'yunda', 'yunda': 'yunda',
  '邮政': 'ems', 'ems': 'ems', '邮政快递': 'ems', '中国邮政': 'ems',
  '京东': 'jd', '京东快递': 'jd', 'jd': 'jd',
  '德邦': 'debang', '德邦快递': 'debang', 'debang': 'debang',
  '百世': 'baishi', '百世快递': 'baishi', 'baishi': 'baishi',
  '菜鸟': 'cainiao', '菜鸟裹裹': 'cainiao', 'cainiao': 'cainiao',
  '丹鸟': 'danniao', 'danniao': 'danniao',
  '宅急送': 'zhaijisong', 'zhaijisong': 'zhaijisong',
  '优速': 'youshu', 'youshu': 'youshu',
  '速尔': 'suer', 'suer': 'suer',
  '天天': 'tiantian', '天天快递': 'tiantian', 'tiantian': 'tiantian',
  '跨越': 'kuayue', '跨越速运': 'kuayue', 'kuayue': 'kuayue',
  '丰网': 'fengwang', 'fengwang': 'fengwang',
  '德坤': 'dekun', 'dekun': 'dekun',
}

function findCarrier(text) {
  const lower = text.toLowerCase()
  // Check longer aliases first to avoid partial matches
  const sorted = Object.keys(CARRIER_ALIASES).sort((a, b) => b.length - a.length)
  for (const key of sorted) {
    if (lower.includes(key)) return CARRIER_ALIASES[key]
  }
  return ''
}

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
    return { type: 'query', tracking_number, carrier_code: findCarrier(trimmed), phone }
  }

  return { type: 'invalid', text: trimmed }
}
