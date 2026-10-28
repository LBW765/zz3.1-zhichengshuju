/**
 * 颜色工具函数
 * 从主色 hex 自动计算 Element Plus 全套衍生色
 */

/**
 * hex 转 RGB
 */
export function hexToRgb(hex) {
  hex = hex.replace(/^#/, '')
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('')
  }
  const num = parseInt(hex, 16)
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}

/**
 * RGB 转 hex
 */
export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('')
}

/**
 * 混合两个颜色（模拟 Element Plus 的 mix 算法）
 * weight: 0~1，表示 color1 的权重
 */
export function mixColor(color1, color2, weight) {
  const c1 = hexToRgb(color1)
  const c2 = hexToRgb(color2)
  return rgbToHex(
    c1.r * weight + c2.r * (1 - weight),
    c1.g * weight + c2.g * (1 - weight),
    c1.b * weight + c2.b * (1 - weight)
  )
}

/**
 * 从主色生成全套 CSS 变量
 * @param {string} hex - 主色 hex 值
 * @param {boolean} isDark - 是否深色模式
 * @returns {Object} CSS 变量键值对
 */
export function generatePrimaryColors(hex, isDark = false) {
  const rgb = hexToRgb(hex)
  const mixBase = isDark ? '#141414' : '#ffffff'

  const vars = {
    '--primary-color': hex,
    '--primary-color-rgb': `${rgb.r}, ${rgb.g}, ${rgb.b}`,
    '--primary-light': mixColor(hex, isDark ? '#ffffff' : '#ffffff', 0.8),
    '--primary-dark': mixColor(hex, '#000000', 0.8),
    '--el-color-primary': hex,
    '--el-color-primary-light-3': mixColor(hex, mixBase, 0.7),
    '--el-color-primary-light-5': mixColor(hex, mixBase, 0.5),
    '--el-color-primary-light-7': mixColor(hex, mixBase, 0.3),
    '--el-color-primary-light-8': mixColor(hex, mixBase, 0.2),
    '--el-color-primary-light-9': mixColor(hex, mixBase, 0.1),
    '--el-color-primary-dark-2': isDark
      ? mixColor(hex, '#ffffff', 0.8)
      : mixColor(hex, '#000000', 0.8),
  }

  // 计算浅色背景变量
  if (isDark) {
    vars['--primary-bg-light'] = mixColor(hex, '#141414', 0.15)
    vars['--primary-bg-lighter'] = mixColor(hex, '#141414', 0.1)
  } else {
    vars['--primary-bg-light'] = mixColor(hex, '#ffffff', 0.1)
    vars['--primary-bg-lighter'] = mixColor(hex, '#ffffff', 0.06)
  }

  return vars
}
