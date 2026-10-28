function toCents(value) {
  if (value === null || value === undefined || value === '') return 0
  const normalized = String(value).replace(/,/g, '').trim()
  if (!normalized) return 0
  const sign = normalized.startsWith('-') ? -1 : 1
  const unsigned = normalized.replace(/^[+-]/, '')
  const [intPart = '0', decimalPart = ''] = unsigned.split('.')
  const cents = `${decimalPart}00`.slice(0, 2)
  return sign * (Number(intPart || 0) * 100 + Number(cents || 0))
}

function fromCents(cents) {
  const value = Number(cents || 0)
  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
}

function add(...values) {
  return values.reduce((sum, value) => sum + toCents(value), 0)
}

function isBalanced(debit, credit) {
  return toCents(debit) === toCents(credit)
}

module.exports = {
  toCents,
  fromCents,
  add,
  isBalanced
}
