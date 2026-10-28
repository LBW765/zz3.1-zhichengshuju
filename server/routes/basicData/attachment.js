const express = require('express')
const path = require('path')
const fs = require('fs')
const multer = require('multer')
const { db } = require('../../db/index')
const { authMiddleware, roleMiddleware } = require('../../middleware/auth')

const router = express.Router()

router.use(authMiddleware)
router.use(roleMiddleware('administrator', 'admin', 'user'))

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads')
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }
})

function normalizeOriginalName(name) {
  if (!name) return ''
  const decoded = Buffer.from(name, 'latin1').toString('utf8')
  return decoded.includes('\uFFFD') ? name : decoded
}

function toApi(row) {
  if (!row) return null
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    fileName: row.file_name,
    filePath: row.file_path,
    fileSize: row.file_size,
    fileType: row.file_type,
    attachmentType: row.attachment_type,
    remark: row.remark || '',
    createdBy: row.created_by,
    createdByName: row.created_by_name || '',
    createdAt: row.created_at
  }
}

router.get('/', async (req, res) => {
  const { entityType, entityId } = req.query

  if (!entityType || !entityId) {
    return res.json({ code: 400, message: '缺少 entityType 或 entityId 参数' })
  }

  try {
    const rows = await db.all(
      `SELECT ba.*, u.nick_name AS created_by_name
       FROM business_attachments ba
       LEFT JOIN users u ON u.id = ba.created_by
       WHERE ba.entity_type = ? AND ba.entity_id = ?
       ORDER BY ba.id DESC`
    , [entityType, Number(entityId)])

    res.json({ code: 200, message: '获取成功', data: { list: rows.map(toApi) } })
  } catch (error) {
    console.error('获取附件列表失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
})

router.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.json({ code: 400, message: '请选择文件' })

  const { entityType, entityId, attachmentType, remark } = req.body

  if (!entityType || !entityId) {
    return res.json({ code: 400, message: '缺少 entityType 或 entityId 参数' })
  }

  try {
    const originalName = normalizeOriginalName(req.file.originalname)
    const result = await db.run(
      `INSERT INTO business_attachments (entity_type, entity_id, file_name, file_path, file_size, file_type, attachment_type, remark, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    , [entityType,
      Number(entityId),
      originalName,
      req.file.filename,
      req.file.size,
      req.file.mimetype || '',
      (attachmentType || '其他').trim(),
      (remark || '').trim(),
      req.user.id])
    res.json({ code: 200, message: '上传成功', data: { id: Number(result.insertId) } })
  } catch (error) {
    console.error('上传附件失败:', error.message)
    res.json({ code: 500, message: '上传失败' })
  }
})

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const existing = await db.get('SELECT * FROM business_attachments WHERE id = ?', [id])
  if (!existing) return res.json({ code: 404, message: '附件不存在' })

  try {
    const filePath = path.join(UPLOAD_DIR, existing.file_path)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)

    await db.run('DELETE FROM business_attachments WHERE id = ?', [id])
    res.json({ code: 200, message: '删除成功' })
  } catch (error) {
    console.error('删除附件失败:', error.message)
    res.json({ code: 500, message: '删除失败' })
  }
})

module.exports = router
