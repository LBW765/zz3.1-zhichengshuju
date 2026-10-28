/**
 * HR sensitive-field crypto helpers.
 *
 * When HR_CRYPTO_KEY is configured, values are stored as AES-256-GCM ciphertext:
 * base64(iv):base64(authTag):base64(ciphertext).
 *
 * HR_CRYPTO_KEY is preferred. If the deployment cannot provide env vars, the
 * built-in key below is used as a stable fallback.
 */

const crypto = require('crypto')

const ALGO = 'aes-256-gcm'
const IV_LEN = 12
const BUILTIN_HR_CRYPTO_KEY = 'ea1b9bc1b1725cb016509ea27027828af0705ef38cc22982f42ac80937d0d6fe'

let cachedKey = null

function loadKey() {
  if (cachedKey) return cachedKey

  const raw = process.env.HR_CRYPTO_KEY || BUILTIN_HR_CRYPTO_KEY
  const buf = /^[0-9a-fA-F]{64}$/.test(raw)
    ? Buffer.from(raw, 'hex')
    : Buffer.from(raw, 'base64')

  if (buf.length !== 32) {
    throw new Error(`[hr/crypto] HR_CRYPTO_KEY must be 32 bytes, got ${buf.length}.`)
  }

  cachedKey = buf
  return cachedKey
}

function isCipherText(value) {
  if (!value) return false
  const parts = String(value).split(':')
  return parts.length === 3 && parts.every(part => part.length > 0)
}

function encrypt(plain) {
  if (plain == null || plain === '') return ''

  const key = loadKey()
  const iv = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const ct = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`
}

function decrypt(cipherText) {
  if (cipherText == null || cipherText === '') return ''
  if (!isCipherText(cipherText)) return String(cipherText)

  const key = loadKey()
  const [ivB64, tagB64, ctB64] = String(cipherText).split(':')
  const iv = Buffer.from(ivB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const ct = Buffer.from(ctB64, 'base64')
  const decipher = crypto.createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  const plain = Buffer.concat([decipher.update(ct), decipher.final()])
  return plain.toString('utf8')
}

function maskIdCard(idCard) {
  if (!idCard) return ''
  const s = String(idCard)
  if (s.length < 8) return s.replace(/.(?=.)/g, '*')
  return `${s.slice(0, 4)}${'*'.repeat(s.length - 8)}${s.slice(-4)}`
}

function maskBankCard(cardNo) {
  if (!cardNo) return ''
  const s = String(cardNo).replace(/\s+/g, '')
  if (s.length <= 4) return '*'.repeat(s.length)
  return `${'*'.repeat(s.length - 4)}${s.slice(-4)}`
}

function maskPhone(phone) {
  if (!phone) return ''
  const s = String(phone)
  if (s.length < 7) return s
  return `${s.slice(0, 3)}****${s.slice(-4)}`
}

module.exports = {
  encrypt,
  decrypt,
  maskIdCard,
  maskBankCard,
  maskPhone
}
