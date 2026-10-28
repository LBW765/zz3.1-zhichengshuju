const express = require('express')
const path = require('path')
const fs = require('fs')
const multer = require('multer')
const sharp = require('sharp')
const { db } = require('../db/index')
const { authMiddleware, roleMiddleware } = require('../middleware/auth')

const router = express.Router()

// ========== 文件上传配置 ==========

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads')
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
  }
})

const uploadMiddleware = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }
})

function normalizeOriginalName(name) {
  if (!name) return ''
  const decoded = Buffer.from(name, 'latin1').toString('utf8')
  return decoded.includes('\uFFFD') ? name : decoded
}

// ========== 平台配置 ==========

router.get('/platform/config', async (req, res) => {
  const rows = await db.all('SELECT `key`, value FROM platform_config')
  const config = {}
  for (const row of rows) config[row.key] = row.value
  res.json({ code: 200, message: '获取成功', data: config })
})

router.put('/platform/config', authMiddleware, roleMiddleware('administrator', 'admin'), async (req, res) => {
  
  try {
    await db.transaction(async (conn) => {
      for (const [key, value] of Object.entries(req.body)) {
        await conn.run('REPLACE INTO platform_config (`key`, value) VALUES (?, ?)', [key, String(value)])
      }
    })
    res.json({ code: 200, message: '保存成功' })
  } catch (error) {
    console.error('保存平台配置失败:', error.message)
    res.json({ code: 500, message: '保存失败' })
  }
})

// ========== 文件上传 ==========

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff', '.tif'])
const TARGET_SIZE = 2 * 1024 * 1024

async function compressImage(filePath, ext) {
  try {
    const originalStats = fs.statSync(filePath)
    const meta = await sharp(filePath).metadata()
    if (!meta.width) return null
    if (originalStats.size <= TARGET_SIZE && meta.format !== 'bmp' && meta.format !== 'tiff') return null

    const outputExt = ['.bmp', '.tiff', '.tif'].includes(ext) ? '.jpg' : ext
    const outputPath = filePath.replace(/\.[^.]+$/, '_compressed' + outputExt)
    let fmt = outputExt === '.png' ? 'png' : outputExt === '.webp' ? 'webp' : 'jpeg'

    let width = meta.width
    let quality = 95
    const MAX_ITERATIONS = 10
    let iterations = 0

    while (iterations < MAX_ITERATIONS) {
      iterations++
      let pipeline = sharp(filePath).rotate()
      if (width < meta.width) {
        pipeline = pipeline.resize(width, null, { withoutEnlargement: true })
      }

      if (fmt === 'png') {
        pipeline = pipeline.png({ compressionLevel: 9, adaptiveFiltering: true })
      } else if (fmt === 'jpeg') {
        pipeline = pipeline.jpeg({ quality, mozjpeg: true })
      } else if (fmt === 'webp') {
        pipeline = pipeline.webp({ quality })
      }

      await pipeline.toFile(outputPath)
      const size = fs.statSync(outputPath).size
      if (size <= TARGET_SIZE) break

      if (fmt === 'png') {
        // PNG quality can't be tuned further, switch to lossy resize
        width = Math.round(width * 0.8)
      } else if (quality > 70) {
        quality -= 5
      } else {
        width = Math.round(width * 0.8)
        quality = 90
      }

      if (width < 800) break
    }

    const compressedStats = fs.statSync(outputPath)
    if (compressedStats.size < originalStats.size) {
      fs.unlinkSync(filePath)
      const finalPath = filePath.replace(/\.[^.]+$/, outputExt)
      fs.renameSync(outputPath, finalPath)
      const newFilename = path.basename(finalPath)
      return { newFilename, newSize: compressedStats.size, newExt: outputExt }
    } else {
      fs.unlinkSync(outputPath)
      return null
    }
  } catch (e) {
    console.log('图片压缩跳过:', e.message)
    return null
  }
}

router.post('/upload', authMiddleware, uploadMiddleware.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.json({ code: 400, message: '请选择要上传的文件' })
    const originalName = normalizeOriginalName(req.file.originalname)
    let filename = req.file.filename
    let fileSize = req.file.size
    const ext = path.extname(filename).toLowerCase()

    if (IMAGE_EXTS.has(ext)) {
      const result = await compressImage(req.file.path, ext)
      if (result) {
        filename = result.newFilename
        fileSize = result.newSize
        console.log('图片压缩:', originalName, `${(req.file.size / 1024).toFixed(0)}KB -> ${(fileSize / 1024).toFixed(0)}KB`)
      }
    }

    const fileUrl = `/uploads/${filename}`
    console.log('文件上传:', originalName, `(${(fileSize / 1024).toFixed(1)}KB)`, '->', fileUrl)
    res.json({
      code: 200,
      message: '上传成功',
      data: { url: fileUrl, originalName, size: fileSize }
    })
  } catch (error) {
    console.error('上传处理失败:', error.message)
    res.json({ code: 500, message: '上传失败' })
  }
})

module.exports = router
