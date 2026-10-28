function hexToRgb(hex) {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `${r}, ${g}, ${b}`
}

function lighten(hex, ratio) {
  const h = hex.replace('#', '')
  const r = Math.round(parseInt(h.substring(0, 2), 16) + (255 - parseInt(h.substring(0, 2), 16)) * ratio)
  const g = Math.round(parseInt(h.substring(2, 4), 16) + (255 - parseInt(h.substring(2, 4), 16)) * ratio)
  const b = Math.round(parseInt(h.substring(4, 6), 16) + (255 - parseInt(h.substring(4, 6), 16)) * ratio)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function darken(hex, ratio) {
  const h = hex.replace('#', '')
  const r = Math.round(parseInt(h.substring(0, 2), 16) * (1 - ratio))
  const g = Math.round(parseInt(h.substring(2, 4), 16) * (1 - ratio))
  const b = Math.round(parseInt(h.substring(4, 6), 16) * (1 - ratio))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

export function applyTheme(color, isDark) {
  if (typeof document === 'undefined') return
  // 挂到 <html> 上，页面切换不会丢失
  const root = document.documentElement
  root.style.setProperty('--primary-color', color)
  root.style.setProperty('--primary-color-rgb', hexToRgb(color))
  root.style.setProperty('--primary-light', lighten(color, 0.3))
  root.style.setProperty('--primary-dark', darken(color, 0.2))

  if (isDark) {
    root.classList.add('theme-dark')
  } else {
    root.classList.remove('theme-dark')
  }
}
