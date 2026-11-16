/**
 * Parses user agent strings into human-readable device/browser summaries
 * e.g. "Chrome 122 on Windows 11", "Safari 17 on iPhone", "Firefox on macOS"
 */
export function parseUserAgent(ua) {
  if (!ua || typeof ua !== 'string') return 'Unknown Device'

  // Operating System
  let os = 'Unknown OS'
  if (/windows nt 10\.0/i.test(ua)) os = 'Windows 10/11'
  else if (/windows nt 6\.3/i.test(ua)) os = 'Windows 8.1'
  else if (/windows nt 6\.1/i.test(ua)) os = 'Windows 7'
  else if (/windows/i.test(ua)) os = 'Windows'
  else if (/iphone/i.test(ua)) os = 'iPhone'
  else if (/ipad/i.test(ua)) os = 'iPad'
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS'
  else if (/android/i.test(ua)) os = 'Android'
  else if (/linux/i.test(ua)) os = 'Linux'

  // Browser & Version
  let browser = 'Browser'
  let version = ''

  const edgMatch = ua.match(/edg(?:e)?\/(\d+)/i)
  const chromeMatch = ua.match(/chrome\/(\d+)/i)
  const safariMatch = ua.match(/version\/(\d+).+safari/i)
  const firefoxMatch = ua.match(/firefox\/(\d+)/i)
  const operaMatch = ua.match(/(?:opera|opr)\/(\d+)/i)

  if (edgMatch) {
    browser = 'Edge'
    version = edgMatch[1]
  } else if (operaMatch) {
    browser = 'Opera'
    version = operaMatch[1]
  } else if (chromeMatch && !/chromium/i.test(ua)) {
    browser = 'Chrome'
    version = chromeMatch[1]
  } else if (safariMatch) {
    browser = 'Safari'
    version = safariMatch[1]
  } else if (firefoxMatch) {
    browser = 'Firefox'
    version = firefoxMatch[1]
  }

  const browserStr = version ? `${browser} ${version}` : browser
  return `${browserStr} on ${os}`
}
