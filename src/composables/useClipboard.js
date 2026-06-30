import html2canvas from 'html2canvas'

export function copyText(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text)
  }
  return fallbackCopyText(text)
}

function fallbackCopyText(text) {
  return new Promise((resolve, reject) => {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px'
    document.body.appendChild(ta)
    ta.focus(); ta.select()
    try {
      document.execCommand('copy')
      document.body.removeChild(ta)
      resolve()
    } catch (e) {
      document.body.removeChild(ta)
      reject(e)
    }
  })
}

const STATUS_COLORS = {
  delivered: '#2e7d32',
  in_transit: '#1565c0',
  out_for_delivery: '#2e7d32',
  picked_up: '#e65100',
  pending: '#9e9e9e',
  exception: '#c62828'
}

const STATUS_BG = {
  delivered: '#e8f5e9',
  in_transit: '#e3f2fd',
  out_for_delivery: '#e8f5e9',
  picked_up: '#fff3e0',
  pending: '#f5f5f5',
  exception: '#ffebee'
}

function buildExportCard(data) {
  const card = document.createElement('div')
  card.style.cssText = `
    width: 420px; background: #fff; border-radius: 16px; overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    box-shadow: 0 4px 24px rgba(0,0,0,0.08); position: fixed; left: -9999px; top: 0;
  `

  const code = data.status_code || 'unknown'
  const dotColor = STATUS_COLORS[code] || '#9e9e9e'
  const badgeBg = STATUS_BG[code] || '#f5f5f5'

  // ---- Header ----
  const header = document.createElement('div')
  header.style.cssText = `
    background: linear-gradient(135deg, #07c160 0%, #05a34f 100%);
    color: #fff; padding: 20px 24px; display: flex; align-items: center; gap: 12px;
  `
  header.innerHTML = `
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
    <div>
      <div style="font-size:18px;font-weight:700;">快递物流查询</div>
      <div style="font-size:12px;opacity:0.8;margin-top:1px;">Express Tracking</div>
    </div>
  `

  // ---- Body ----
  const body = document.createElement('div')
  body.style.cssText = 'padding: 20px 24px;'

  // Carrier + number row
  const carrierRow = document.createElement('div')
  carrierRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:6px;'
  carrierRow.innerHTML = `
    <span style="font-size:17px;font-weight:700;color:#1a1a1a;">${esc(data.carrier_name || '未知快递')}</span>
    <span style="font-size:13px;color:#07c160;background:#e8f8ee;padding:3px 10px;border-radius:4px;font-family:monospace;letter-spacing:0.5px;">${esc(data.tracking_number)}</span>
  `
  body.appendChild(carrierRow)

  // Status badge
  const badge = document.createElement('span')
  badge.style.cssText = `
    display:inline-block;padding:5px 16px;border-radius:12px;font-size:13px;font-weight:600;
    background:${badgeBg};color:${dotColor};margin-bottom:16px;
  `
  badge.textContent = data.status || '未知'
  body.appendChild(badge)

  // Divider
  const divider = document.createElement('div')
  divider.style.cssText = 'height:1px;background:#f0f0f0;margin-bottom:16px;'
  body.appendChild(divider)

  // Timeline section title
  const tlTitle = document.createElement('div')
  tlTitle.style.cssText = 'font-size:13px;color:#999;margin-bottom:12px;display:flex;align-items:center;gap:6px;'
  tlTitle.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>物流轨迹`
  body.appendChild(tlTitle)

  // Timeline
  if (data.tracks?.length) {
    const tl = document.createElement('div')
    tl.style.cssText = 'position:relative;'
    data.tracks.forEach((t, i) => {
      const item = document.createElement('div')
      item.style.cssText = `
        position:relative;padding-left:24px;padding-bottom:${i === data.tracks.length - 1 ? '0' : '14px'};
      `
      // vertical line
      if (i < data.tracks.length - 1) {
        const line = document.createElement('div')
        line.style.cssText = `
          position:absolute;left:5px;top:8px;bottom:0;width:2px;background:#e8e8e8;
        `
        item.appendChild(line)
      }
      // dot
      const dot = document.createElement('div')
      dot.style.cssText = `
        position:absolute;left:0;top:4px;width:12px;height:12px;border-radius:50%;
        background:${i === 0 ? dotColor : '#d0d0d0'};border:2px solid #fff;
        box-shadow:0 0 0 2px ${i === 0 ? dotColor + '33' : '#e0e0e0'};
        z-index:1;
      `
      item.appendChild(dot)
      // content
      const content = document.createElement('div')
      content.innerHTML = `
        <div style="font-size:12px;color:#aaa;margin-bottom:2px;">${esc(t.time)}</div>
        <div style="font-size:14px;color:#333;line-height:1.5;">${esc(t.context)}</div>
      `
      item.appendChild(content)
      tl.appendChild(item)
    })
    body.appendChild(tl)
  } else {
    const empty = document.createElement('p')
    empty.style.cssText = 'color:#999;font-size:14px;'
    empty.textContent = '暂无物流轨迹信息'
    body.appendChild(empty)
  }

  // Completed note
  if (data.is_completed && data.completed_at) {
    const done = document.createElement('div')
    done.style.cssText = `
      margin-top:14px;padding:10px 14px;background:#f6ffed;border-radius:8px;
      font-size:13px;color:#52c41a;display:flex;align-items:center;gap:6px;
    `
    done.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>已于 ${esc(data.completed_at)} 签收`
    body.appendChild(done)
  }

  // ---- Footer ----
  const footer = document.createElement('div')
  footer.style.cssText = `
    padding:12px 24px;background:#fafafa;border-top:1px solid #f0f0f0;
    font-size:11px;color:#bbb;text-align:center;
  `
  footer.innerHTML = `查询时间 ${new Date().toLocaleString('zh-CN')}`
  body.appendChild(footer)

  card.appendChild(header)
  card.appendChild(body)
  document.body.appendChild(card)
  return card
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export async function captureTrackingResult(data, action) {
  if (typeof html2canvas === 'undefined') throw new Error('html2canvas 未加载')
  const card = buildExportCard(data)
  try {
    const canvas = await html2canvas(card, { backgroundColor: null, scale: 2 })
    if (action === 'download') {
      const link = document.createElement('a')
      link.download = (data.tracking_number || '快递') + '.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    } else if (action === 'clipboard') {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('图片生成失败')
      if (!navigator.clipboard?.write) throw new Error('浏览器不支持复制图片')
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    }
  } finally {
    document.body.removeChild(card)
  }
}
