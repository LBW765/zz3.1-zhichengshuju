function normalizeUploadedFilename(name) {
  if (!name) return ''
  const decoded = Buffer.from(name, 'latin1').toString('utf8')
  return decoded.includes('\uFFFD') ? name : decoded
}

module.exports = {
  normalizeUploadedFilename
}
