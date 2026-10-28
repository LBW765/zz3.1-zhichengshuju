const express = require('express')
const { db } = require('../../db/index')
const { authMiddleware, roleMiddleware } = require('../../middleware/auth')
const { resolveBusinessCode } = require('../../services/codeGenerator')
const { getDuplicateMessageByRule } = require('../../utils/uniqueBusinessCode')

const router = express.Router()

router.use(authMiddleware)
router.use(roleMiddleware('administrator', 'admin', 'user'))

async function getActiveEmployeeById(employeeId) {
  if (!employeeId) return null
  return await db.get(
    `SELECT id, user_id, emp_no, name, phone
     FROM employees
     WHERE id = ? AND status != 'resigned'`
  , [Number(employeeId)]) || null
}

function getEmployeeDisplayName(employee) {
  if (!employee) return ''
  return String(employee.name || employee.emp_no || '').trim()
}

// ========== 车间 ==========

async function sendEmployeeOptions(res) {
  try {
    const rows = await db.all(
      `SELECT id, user_id, emp_no, name, phone
       FROM employees
       WHERE status != 'resigned'
       ORDER BY id ASC`
    )

    res.json({
      code: 200,
      message: '获取成功',
      data: rows.map(async (row) => ({
        id: row.id,
        userId: row.user_id || null,
        empNo: row.emp_no || '',
        name: row.name || '',
        phone: row.phone || '',
        displayName: getEmployeeDisplayName(row)
      }))
    })
  } catch (error) {
    console.error('获取员工选项失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
}

router.get('/employee-options', async (req, res) => {
  sendEmployeeOptions(res)
})

router.get('/user-options', async (req, res) => {
  sendEmployeeOptions(res)
})

function workshopToApi(row) {
  if (!row) return null
  return {
    id: row.id,
    workshopCode: row.workshop_code,
    workshopName: row.workshop_name,
    workshopType: row.workshop_type || '',
    manager: row.manager || '',
    phone: row.phone || '',
    area: row.area,
    address: row.address || '',
    sort: row.sort || 0,
    status: row.status,
    lineCount: row.line_count || 0,
    remark: row.remark || '',
    createdBy: row.created_by,
    createdByName: row.created_by_name || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function lineToApi(row) {
  if (!row) return null
  return {
    id: row.id,
    workshopId: row.workshop_id,
    lineCode: row.line_code,
    lineName: row.line_name,
    lineType: row.line_type || '',
    dailyCapacity: row.daily_capacity,
    manager: row.manager || '',
    sort: row.sort || 0,
    status: row.status,
    teamCount: row.team_count || 0,
    remark: row.remark || '',
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function teamToApi(row) {
  if (!row) return null
  return {
    id: row.id,
    lineId: row.line_id,
    teamCode: row.team_code,
    teamName: row.team_name,
    shiftType: row.shift_type || '',
    leader: row.leader || '',
    maxMembers: row.max_members,
    sort: row.sort || 0,
    status: row.status,
    memberCount: row.member_count || 0,
    remark: row.remark || '',
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

// 车间列表
router.get('/', async (req, res) => {
  const keyword = (req.query.keyword || '').trim()
  const status = req.query.status

  let conditions = ''
  const params = []

  if (keyword) {
    conditions += ' AND (w.workshop_code LIKE ? OR w.workshop_name LIKE ?)'
    params.push(`%${keyword}%`, `%${keyword}%`)
  }
  if (status !== undefined && status !== '') {
    conditions += ' AND w.status = ?'
    params.push(Number(status))
  }

  try {
    const rows = await db.all(
      `SELECT w.*,
              usr.nick_name AS created_by_name,
              (SELECT COUNT(*) FROM production_lines WHERE workshop_id = w.id) AS line_count
       FROM workshops w
       LEFT JOIN users usr ON usr.id = w.created_by
       WHERE 1=1${conditions}
       ORDER BY w.sort ASC, w.id ASC`
    , params)

    res.json({ code: 200, message: '获取成功', data: rows.map(workshopToApi) })
  } catch (error) {
    console.error('获取车间列表失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
})

// 车间详情（含产线列表）
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id)
  try {
    const row = await db.get(
      `SELECT w.*, usr.nick_name AS created_by_name,
              (SELECT COUNT(*) FROM production_lines WHERE workshop_id = w.id) AS line_count
       FROM workshops w
       LEFT JOIN users usr ON usr.id = w.created_by
       WHERE w.id = ?`
    , [id])
    if (!row) return res.json({ code: 404, message: '车间不存在' })

    const lines = await db.all(
      `SELECT pl.*,
              (SELECT COUNT(*) FROM work_teams WHERE line_id = pl.id) AS team_count
       FROM production_lines pl
       WHERE pl.workshop_id = ?
       ORDER BY pl.sort ASC, pl.id ASC`
    , [id])

    const data = workshopToApi(row)
    data.lines = lines.map(lineToApi)

    res.json({ code: 200, message: '获取成功', data })
  } catch (error) {
    console.error('获取车间详情失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
})

// 新增车间
router.post('/', async (req, res) => {
  const { workshopCode, workshopName, workshopType, manager, managerUserId, phone, area, address, sort, status, remark } = req.body

  if (!workshopName || !workshopName.trim()) return res.json({ code: 400, message: '车间名称不能为空' })

  const code = await resolveBusinessCode('workshop', workshopCode, 'CJ')
  const duplicateMessage = getDuplicateMessageByRule(db, 'workshop', code)
  if (duplicateMessage) return res.json({ code: 400, message: duplicateMessage })

  try {
    const managerEmployee = getActiveEmployeeById(managerUserId)
    const resolvedManager = managerEmployee ? getEmployeeDisplayName(managerEmployee) : (manager || '').trim()
    const resolvedPhone = managerEmployee ? String(managerEmployee.phone || '').trim() : (phone || '').trim()
    const result = await db.run(
      `INSERT INTO workshops (workshop_code, workshop_name, workshop_type, manager, phone, area, address, sort, status, remark, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    , [code, workshopName.trim(), (workshopType || '').trim(),
      resolvedManager, resolvedPhone, area != null ? Number(area) : null,
      (address || '').trim(), Number(sort || 0), status !== undefined ? Number(status) : 1,
      (remark || '').trim(), req.user.id])
    res.json({ code: 200, message: '添加成功', data: { id: Number(result.insertId) } })
  } catch (error) {
    console.error('添加车间失败:', error.message)
    res.json({ code: 500, message: '添加失败' })
  }
})

// 编辑车间
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const existing = await db.get('SELECT * FROM workshops WHERE id = ?', [id])
  if (!existing) return res.json({ code: 404, message: '车间不存在' })

  const { workshopName, workshopType, manager, managerUserId, phone, area, address, sort, status, remark } = req.body

  try {
    const managerEmployee = managerUserId ? getActiveEmployeeById(managerUserId) : null
    const resolvedManager = managerEmployee
      ? getEmployeeDisplayName(managerEmployee)
      : (manager !== undefined ? String(manager).trim() : existing.manager)
    const resolvedPhone = managerEmployee
      ? String(managerEmployee.phone || '').trim()
      : (phone !== undefined ? String(phone).trim() : existing.phone)
    await db.run(
      `UPDATE workshops SET workshop_name=?, workshop_type=?, manager=?, phone=?, area=?, address=?, sort=?, status=?, remark=?,
        updated_at=NOW() WHERE id=?`
    , [workshopName !== undefined ? String(workshopName).trim() : existing.workshop_name,
      workshopType !== undefined ? String(workshopType).trim() : existing.workshop_type,
      resolvedManager,
      resolvedPhone,
      area !== undefined ? (area != null ? Number(area) : null) : existing.area,
      address !== undefined ? String(address).trim() : existing.address,
      sort !== undefined ? Number(sort) : existing.sort,
      status !== undefined ? Number(status) : existing.status,
      remark !== undefined ? String(remark).trim() : existing.remark,
      id])
    res.json({ code: 200, message: '更新成功' })
  } catch (error) {
    console.error('更新车间失败:', error.message)
    res.json({ code: 500, message: '更新失败' })
  }
})

// 启用/停用车间
router.put('/:id/status', async (req, res) => {
  const id = Number(req.params.id)
  const { status } = req.body
  const existing = await db.get('SELECT id FROM workshops WHERE id = ?', [id])
  if (!existing) return res.json({ code: 404, message: '车间不存在' })

  try {
    await db.run(
      `UPDATE workshops SET status=?, updated_at=NOW() WHERE id=?`
    , [Number(status), id])
    res.json({ code: 200, message: '状态更新成功' })
  } catch (error) {
    console.error('更新车间状态失败:', error.message)
    res.json({ code: 500, message: '状态更新失败' })
  }
})

// 批量导入车间
router.post('/import', async (req, res) => {
  const { rows: list } = req.body
  if (!Array.isArray(list) || list.length === 0) {
    return res.json({ code: 400, message: '导入数据不能为空' })
  }

  const toNum = (v) => (v !== undefined && v !== null && v !== '') ? Number(v) : null

  const errors = []
  let success = 0

  

  try {
    await db.transaction(async (conn) => {
      for (let i = 0; i < list.length; i++) {
        const row = list[i]
        const rowNum = i + 1
        try {
          if (!row.workshopCode || !String(row.workshopCode).trim()) {
            errors.push(`第${rowNum}行：车间编码不能为空`); continue
          }
          if (!row.workshopName || !String(row.workshopName).trim()) {
            errors.push(`第${rowNum}行：车间名称不能为空`); continue
          }

          const code = String(row.workshopCode).trim()
          const dup = await db.get('SELECT id FROM workshops WHERE workshop_code = ?', [code])
          if (dup) {
            errors.push(`第${rowNum}行：车间编码"${code}"已存在`); continue
          }

          await db.run(
    `INSERT INTO workshops (workshop_code, workshop_name, workshop_type, manager, phone, area, address, sort, status, remark, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  , [code,
            String(row.workshopName).trim(),
            (row.workshopType || '').toString().trim(),
            (row.manager || '').toString().trim(),
            (row.phone || '').toString().trim(),
            toNum(row.area),
            (row.address || '').toString().trim(),
            toNum(row.sort) || 0,
            1,
            (row.remark || '').toString().trim(),
            req.user.id])
          success++
        } catch (e) {
          errors.push(`第${rowNum}行：${e.message}`)
        }
      }
    })

    res.json({
      code: 200,
      message: `导入完成：成功 ${success} 条${errors.length ? '，失败 ' + errors.length + ' 条' : ''}`,
      data: { total: list.length, success, failed: errors.length, errors }
    })
  } catch (error) {
    console.error('批量导入车间失败:', error.message)
    res.json({ code: 500, message: '导入失败：' + error.message })
  }
})

// 删除车间
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id)
  const existing = await db.get('SELECT id FROM workshops WHERE id = ?', [id])
  if (!existing) return res.json({ code: 404, message: '车间不存在' })

  const lineCount = (await db.get('SELECT COUNT(*) as count FROM production_lines WHERE workshop_id = ?', [id])).count
  if (lineCount > 0) return res.json({ code: 400, message: '该车间下存在产线，请先删除产线' })

  try {
    await db.run('DELETE FROM workshops WHERE id = ?', [id])
    res.json({ code: 200, message: '删除成功' })
  } catch (error) {
    console.error('删除车间失败:', error.message)
    res.json({ code: 500, message: '删除失败' })
  }
})

// ========== 产线 ==========

// 产线列表
router.get('/:workshopId/lines', async (req, res) => {
  const workshopId = Number(req.params.workshopId)
  try {
    const rows = await db.all(
      `SELECT pl.*,
              (SELECT COUNT(*) FROM work_teams WHERE line_id = pl.id) AS team_count
       FROM production_lines pl
       WHERE pl.workshop_id = ?
       ORDER BY pl.sort ASC, pl.id ASC`
    , [workshopId])

    res.json({ code: 200, message: '获取成功', data: rows.map(lineToApi) })
  } catch (error) {
    console.error('获取产线列表失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
})

// 产线详情（含班组列表）
router.get('/:workshopId/lines/:lineId', async (req, res) => {
  const lineId = Number(req.params.lineId)
  try {
    const row = await db.get(
      `SELECT pl.*,
              (SELECT COUNT(*) FROM work_teams WHERE line_id = pl.id) AS team_count
       FROM production_lines pl
       WHERE pl.id = ?`
    , [lineId])
    if (!row) return res.json({ code: 404, message: '产线不存在' })

    const teams = await db.all(
      `SELECT wt.*,
              (SELECT COUNT(*) FROM work_team_members WHERE team_id = wt.id) AS member_count
       FROM work_teams wt
       WHERE wt.line_id = ?
       ORDER BY wt.sort ASC, wt.id ASC`
    , [lineId])

    const data = lineToApi(row)
    data.teams = teams.map(teamToApi)

    res.json({ code: 200, message: '获取成功', data })
  } catch (error) {
    console.error('获取产线详情失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
})

// 新增产线
router.post('/:workshopId/lines', async (req, res) => {
  const workshopId = Number(req.params.workshopId)
  const { lineCode, lineName, lineType, dailyCapacity, manager, managerUserId, sort, status, remark } = req.body

  if (!lineName || !lineName.trim()) return res.json({ code: 400, message: '产线名称不能为空' })

  const code = await resolveBusinessCode('production_line', lineCode, 'CX')
  const duplicateMessage = getDuplicateMessageByRule(db, 'production_line', code)
  if (duplicateMessage) return res.json({ code: 400, message: duplicateMessage })

  try {
    const managerEmployee = getActiveEmployeeById(managerUserId)
    const resolvedManager = managerEmployee ? getEmployeeDisplayName(managerEmployee) : (manager || '').trim()
    const result = await db.run(
      `INSERT INTO production_lines (workshop_id, line_code, line_name, line_type, daily_capacity, manager, sort, status, remark, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    , [workshopId, code, lineName.trim(), (lineType || '').trim(),
      dailyCapacity != null ? Number(dailyCapacity) : null,
      resolvedManager, Number(sort || 0), status !== undefined ? Number(status) : 1,
      (remark || '').trim(), req.user.id])
    res.json({ code: 200, message: '添加成功', data: { id: Number(result.insertId) } })
  } catch (error) {
    console.error('添加产线失败:', error.message)
    res.json({ code: 500, message: '添加失败' })
  }
})

// 编辑产线
router.put('/:workshopId/lines/:lineId', async (req, res) => {
  const lineId = Number(req.params.lineId)
  const existing = await db.get('SELECT * FROM production_lines WHERE id = ?', [lineId])
  if (!existing) return res.json({ code: 404, message: '产线不存在' })

  const { lineName, lineType, dailyCapacity, manager, managerUserId, sort, status, remark } = req.body

  try {
    const managerEmployee = managerUserId ? getActiveEmployeeById(managerUserId) : null
    const resolvedManager = managerEmployee
      ? getEmployeeDisplayName(managerEmployee)
      : (manager !== undefined ? String(manager).trim() : existing.manager)
    await db.run(
      `UPDATE production_lines SET line_name=?, line_type=?, daily_capacity=?, manager=?, sort=?, status=?, remark=?,
        updated_at=NOW() WHERE id=?`
    , [lineName !== undefined ? String(lineName).trim() : existing.line_name,
      lineType !== undefined ? String(lineType).trim() : existing.line_type,
      dailyCapacity !== undefined ? (dailyCapacity != null ? Number(dailyCapacity) : null) : existing.daily_capacity,
      resolvedManager,
      sort !== undefined ? Number(sort) : existing.sort,
      status !== undefined ? Number(status) : existing.status,
      remark !== undefined ? String(remark).trim() : existing.remark,
      lineId])
    res.json({ code: 200, message: '更新成功' })
  } catch (error) {
    console.error('更新产线失败:', error.message)
    res.json({ code: 500, message: '更新失败' })
  }
})

// 删除产线
router.delete('/:workshopId/lines/:lineId', async (req, res) => {
  const lineId = Number(req.params.lineId)
  const existing = await db.get('SELECT id FROM production_lines WHERE id = ?', [lineId])
  if (!existing) return res.json({ code: 404, message: '产线不存在' })

  const teamCount = (await db.get('SELECT COUNT(*) as count FROM work_teams WHERE line_id = ?', [lineId])).count
  if (teamCount > 0) return res.json({ code: 400, message: '该产线下存在班组，请先删除班组' })

  try {
    await db.run('DELETE FROM production_lines WHERE id = ?', [lineId])
    res.json({ code: 200, message: '删除成功' })
  } catch (error) {
    console.error('删除产线失败:', error.message)
    res.json({ code: 500, message: '删除失败' })
  }
})

// ========== 班组 ==========

// 班组列表
router.get('/lines/:lineId/teams', async (req, res) => {
  const lineId = Number(req.params.lineId)
  try {
    const rows = await db.all(
      `SELECT wt.*,
              (SELECT COUNT(*) FROM work_team_members WHERE team_id = wt.id) AS member_count
       FROM work_teams wt
       WHERE wt.line_id = ?
       ORDER BY wt.sort ASC, wt.id ASC`
    , [lineId])

    res.json({ code: 200, message: '获取成功', data: rows.map(teamToApi) })
  } catch (error) {
    console.error('获取班组列表失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
})

// 班组详情（含人员）
router.get('/lines/:lineId/teams/:teamId', async (req, res) => {
  const teamId = Number(req.params.teamId)
  try {
    const row = await db.get(
      `SELECT wt.*,
              (SELECT COUNT(*) FROM work_team_members WHERE team_id = wt.id) AS member_count
       FROM work_teams wt
       WHERE wt.id = ?`
    , [teamId])
    if (!row) return res.json({ code: 404, message: '班组不存在' })

    const members = await db.all(
      `SELECT wtm.id, wtm.user_id, wtm.role_in_team, wtm.joined_at,
              u.username, u.nick_name, u.phone
       FROM work_team_members wtm
       LEFT JOIN users u ON u.id = wtm.user_id
       WHERE wtm.team_id = ?
       ORDER BY wtm.id ASC`
    , [teamId])

    const data = teamToApi(row)
    data.members = members.map(async m => ({
      id: m.id,
      userId: m.user_id,
      username: m.username || '',
      nickName: m.nick_name || '',
      phone: m.phone || '',
      roleInTeam: m.role_in_team || '组员',
      joinedAt: m.joined_at
    }))

    res.json({ code: 200, message: '获取成功', data })
  } catch (error) {
    console.error('获取班组详情失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
})

// 新增班组
router.post('/lines/:lineId/teams', async (req, res) => {
  const lineId = Number(req.params.lineId)
  const { teamCode, teamName, shiftType, leader, leaderUserId, maxMembers, sort, status, remark } = req.body

  if (!teamName || !teamName.trim()) return res.json({ code: 400, message: '班组名称不能为空' })

  const code = await resolveBusinessCode('work_team', teamCode, 'BZ')
  const duplicateMessage = getDuplicateMessageByRule(db, 'work_team', code)
  if (duplicateMessage) return res.json({ code: 400, message: duplicateMessage })

  try {
    const leaderEmployee = getActiveEmployeeById(leaderUserId)
    const resolvedLeader = leaderEmployee ? getEmployeeDisplayName(leaderEmployee) : (leader || '').trim()

    await db.transaction(async (conn) => {
      const result = await db.run(
        `INSERT INTO work_teams (line_id, team_code, team_name, shift_type, leader, max_members, sort, status, remark, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      , [lineId, code, teamName.trim(), (shiftType || '').trim(),
        resolvedLeader, maxMembers != null ? Number(maxMembers) : null,
        Number(sort || 0), status !== undefined ? Number(status) : 1,
        (remark || '').trim(), req.user.id])

      const teamId = Number(result.insertId)
      if (leaderEmployee?.user_id) {
        await db.run(
          `INSERT INTO work_team_members (team_id, user_id, role_in_team)
           VALUES (?, ?, ?)`
        , [teamId, leaderEmployee.user_id, '组长'])
      }
      return teamId
    })

    const teamId = createTeam()
    res.json({ code: 200, message: '添加成功', data: { id: teamId } })
  } catch (error) {
    console.error('添加班组失败:', error.message)
    res.json({ code: 500, message: '添加失败' })
  }
})

// 编辑班组
router.put('/lines/:lineId/teams/:teamId', async (req, res) => {
  const teamId = Number(req.params.teamId)
  const existing = await db.get('SELECT * FROM work_teams WHERE id = ?', [teamId])
  if (!existing) return res.json({ code: 404, message: '班组不存在' })

  const { teamName, shiftType, leader, leaderUserId, maxMembers, sort, status, remark } = req.body

  try {
    const leaderEmployee = leaderUserId ? getActiveEmployeeById(leaderUserId) : null
    const resolvedLeader = leaderEmployee
      ? getEmployeeDisplayName(leaderEmployee)
      : (leader !== undefined ? String(leader).trim() : existing.leader)

    await db.transaction(async (conn) => {
      await db.run(
        `UPDATE work_teams SET team_name=?, shift_type=?, leader=?, max_members=?, sort=?, status=?, remark=?,
          updated_at=NOW() WHERE id=?`
      , [teamName !== undefined ? String(teamName).trim() : existing.team_name,
        shiftType !== undefined ? String(shiftType).trim() : existing.shift_type,
        resolvedLeader,
        maxMembers !== undefined ? (maxMembers != null ? Number(maxMembers) : null) : existing.max_members,
        sort !== undefined ? Number(sort) : existing.sort,
        status !== undefined ? Number(status) : existing.status,
        remark !== undefined ? String(remark).trim() : existing.remark,
        teamId])

      if (leaderEmployee?.user_id) {
        const existingMember = await db.get(
          'SELECT id FROM work_team_members WHERE team_id = ? AND user_id = ?'
        , [teamId, leaderEmployee.user_id])
        if (existingMember) {
          await db.run(
            `UPDATE work_team_members
             SET role_in_team = ?
             WHERE id = ?`
          , ['组长', existingMember.id])
        } else {
          await db.run(
            `INSERT INTO work_team_members (team_id, user_id, role_in_team)
             VALUES (?, ?, ?)`
          , [teamId, leaderEmployee.user_id, '组长'])
        }
      }
    })

    res.json({ code: 200, message: '更新成功' })
  } catch (error) {
    console.error('更新班组失败:', error.message)
    res.json({ code: 500, message: '更新失败' })
  }
})

// 删除班组
router.delete('/lines/:lineId/teams/:teamId', async (req, res) => {
  const teamId = Number(req.params.teamId)
  const existing = await db.get('SELECT id FROM work_teams WHERE id = ?', [teamId])
  if (!existing) return res.json({ code: 404, message: '班组不存在' })

  try {
    await db.run('DELETE FROM work_teams WHERE id = ?', [teamId])
    res.json({ code: 200, message: '删除成功' })
  } catch (error) {
    console.error('删除班组失败:', error.message)
    res.json({ code: 500, message: '删除失败' })
  }
})

// ========== 班组人员 ==========

// 添加人员
router.post('/teams/:teamId/members', async (req, res) => {
  const teamId = Number(req.params.teamId)
  const { userId, roleInTeam } = req.body

  if (!userId) return res.json({ code: 400, message: '请选择人员' })

  const team = await db.get('SELECT * FROM work_teams WHERE id = ?', [teamId])
  if (!team) return res.json({ code: 404, message: '班组不存在' })

  const existingMember = await db.get('SELECT id FROM work_team_members WHERE team_id = ? AND user_id = ?', [teamId, Number(userId)])
  if (existingMember) return res.json({ code: 400, message: '该人员已在班组中' })

  if (team.max_members) {
    const currentCount = (await db.get('SELECT COUNT(*) as count FROM work_team_members WHERE team_id = ?', [teamId])).count
    if (currentCount >= team.max_members) return res.json({ code: 400, message: `班组人数已达上限 (${team.max_members})` })
  }

  try {
    const result = await db.run(
      'INSERT INTO work_team_members (team_id, user_id, role_in_team) VALUES (?, ?, ?)'
    , [teamId, Number(userId), (roleInTeam || '组员').trim()])

    res.json({ code: 200, message: '添加成功', data: { id: Number(result.insertId) } })
  } catch (error) {
    console.error('添加班组人员失败:', error.message)
    res.json({ code: 500, message: '添加失败' })
  }
})

// 移除人员
router.delete('/teams/:teamId/members/:memberId', async (req, res) => {
  const memberId = Number(req.params.memberId)
  const existing = await db.get('SELECT id FROM work_team_members WHERE id = ?', [memberId])
  if (!existing) return res.json({ code: 404, message: '记录不存在' })

  try {
    await db.run('DELETE FROM work_team_members WHERE id = ?', [memberId])
    res.json({ code: 200, message: '移除成功' })
  } catch (error) {
    console.error('移除班组人员失败:', error.message)
    res.json({ code: 500, message: '移除失败' })
  }
})

// 获取可选人员列表（排除已在指定班组中的）
router.get('/teams/:teamId/available-users', async (req, res) => {
  const teamId = Number(req.params.teamId)
  try {
    const rows = await db.all(
      `SELECT u.id, u.username, u.nick_name, u.phone
       FROM users u
       WHERE u.status = 1 AND u.id NOT IN (SELECT user_id FROM work_team_members WHERE team_id = ?)
       ORDER BY u.id ASC`
    , [teamId])

    res.json({
      code: 200, message: '获取成功',
      data: rows.map(u => ({ id: u.id, username: u.username, nickName: u.nick_name || '', phone: u.phone || '' }))
    })
  } catch (error) {
    console.error('获取可选人员失败:', error.message)
    res.json({ code: 500, message: '获取失败' })
  }
})

module.exports = router
