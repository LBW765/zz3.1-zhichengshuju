const express = require('express')
const { db } = require('../db/index')
const { authMiddleware } = require('../middleware/auth')

const router = express.Router()

router.use(authMiddleware)

async function getDiskUsage() {
  if (process.platform !== 'win32') return 0

  const { execFile } = require('child_process')
  const { promisify } = require('util')
  const execFileAsync = promisify(execFile)
  const drive = (process.cwd().split(':')[0] || 'C').toUpperCase()
  const command = `(Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='${drive}:'" | Select-Object -ExpandProperty Size),` +
    `(Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='${drive}:'" | Select-Object -ExpandProperty FreeSpace)`
  const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-Command', command])
  const [size, free] = stdout
    .split(/\r?\n/)
    .map(line => Number(line.trim()))
    .filter(Number.isFinite)
  if (!size) return 0
  return Math.round(((size - free) / size) * 100)
}

router.get('/stats', async (_req, res) => {
  try {
    const userCount = (await db.get('SELECT COUNT(*) AS count FROM users')).count
    const menuCount = (await db.get('SELECT COUNT(*) AS count FROM menus')).count
    const roleCount = (await db.get('SELECT COUNT(*) AS count FROM roles')).count
    const today = new Date().toISOString().split('T')[0]
    const todayLoginCount = (await db.get('SELECT COUNT(*) AS count FROM tokens WHERE DATE(created_at) = ?', [today])).count

    res.json({ code: 200, message: '获取成功', data: { userCount, menuCount, roleCount, todayLoginCount } })
  } catch (error) {
    console.error('获取统计数据失败:', error.message)
    res.json({ code: 500, message: '获取统计数据失败' })
  }
})

router.get('/system-stats', async (_req, res) => {
  try {
    const os = require('os')
    const cpus = os.cpus()
    let totalIdle = 0
    let totalTick = 0
    cpus.forEach(cpu => {
      for (const type in cpu.times) totalTick += cpu.times[type]
      totalIdle += cpu.times.idle
    })
    const cpu = Math.round(100 - (totalIdle / totalTick * 100))
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const memory = Math.round(((totalMem - freeMem) / totalMem) * 100)
    const disk = await getDiskUsage()
    const onlineUsers = (await db.get(
      'SELECT COUNT(DISTINCT user_id) AS count FROM tokens WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 MINUTE)'
    )).count

    res.json({ code: 200, message: '获取成功', data: { cpu, memory, disk, onlineUsers } })
  } catch (error) {
    console.error('获取系统监控数据失败:', error.message)
    res.json({ code: 500, message: '获取系统监控数据失败' })
  }
})

router.get('/login-records', async (_req, res) => {
  try {
    const records = await db.all(`
      SELECT u.username, t.created_at AS loginTime
      FROM tokens t
      JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
      LIMIT 10
    `)
    res.json({
      code: 200,
      message: '获取成功',
      data: records.map(item => ({ username: item.username, loginTime: item.loginTime, ip: '127.0.0.1' }))
    })
  } catch (error) {
    console.error('获取登录记录失败:', error.message)
    res.json({ code: 500, message: '获取登录记录失败' })
  }
})

router.get('/widgets', (_req, res) => {
  res.json({
    code: 200,
    message: '获取成功',
    data: { widgets: ['system-monitor', 'data-stats', 'login-records', 'quick-actions'] }
  })
})

module.exports = router
