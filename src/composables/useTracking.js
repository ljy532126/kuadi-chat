export async function queryTracking(apiKey, { tracking_number, carrier_code, phone }, authToken = '', useGlobal = false) {
  const url = new URL('/api/v1/misc/tracking/query', window.location.origin)
  url.searchParams.set('tracking_number', tracking_number)
  if (carrier_code) url.searchParams.set('carrier_code', carrier_code)
  if (phone) url.searchParams.set('phone', phone)

  const headers = { 'Accept': 'application/json' }
  if (useGlobal) {
    headers['X-Use-Global'] = '1'
  } else {
    headers['X-Uapi-Key'] = 'Bearer uapi-' + apiKey
  }
  if (authToken) headers['Authorization'] = 'Bearer ' + authToken

  let response
  try {
    response = await fetch(url.toString(), { method: 'GET', headers })
  } catch {
    return { error: true, status: 0, message: '网络请求失败，请检查网络连接。' }
  }

  if (!response.ok) {
    let msg = ''
    let code = ''
    try { const body = await response.json(); msg = body.message || body.error || ''; code = body.error || '' } catch {}
    return { error: true, status: response.status, message: msg, code }
  }

  let data = {}
  try { data = await response.json() } catch {}
  return { error: false, data, free_queries_left: data.free_queries_left }
}
