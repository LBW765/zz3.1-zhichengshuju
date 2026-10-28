const express = require('express')
const bcrypt = require('bcryptjs')
const { getUserByUsername, getUserById, createToken, deleteToken } = require('../db/helpers')
const { authMiddleware } = require('../middleware/auth')
const { db } = require('../db')

const router = express.Router()

router.post('/login', async (req, res) => {
  const { username, password } = req.body
  console.log('登录请求:', username)

  const user = await getUserByUsername(username)
  if (!user) return res.json({ code: 401, message: '用户名或密码错误' })
  if (!bcrypt.compareSync(password, user.password)) return res.json({ code: 401, message: '用户名或密码错误' })
  if (!user.status) return res.json({ code: 403, message: '账号已被禁用' })

  const token = await createToken(user.id, username)
  console.log('登录成功:', username)
  res.json({ code: 200, message: '登录成功', data: { token } })
})

router.get('/user/info', authMiddleware, async (req, res) => {
  const user = req.user
  const { password, roles, permissions, ...userInfo } = user

  const apiUser = {
    userId: userInfo.id,
    userName: userInfo.username,
    nickName: userInfo.nick_name,
    email: userInfo.email,
    phone: userInfo.phone,
    avatar: userInfo.avatar,
    deptName: userInfo.dept_name,
    roleName: userInfo.role_name,
    createTime: userInfo.created_at
  }

  console.log('获取用户信息:', user.username, '角色:', roles)
  res.json({ code: 200, message: '获取成功', data: { user: apiUser, roles, permissions } })
})

router.post('/logout', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (token) await deleteToken(token)
  res.json({ code: 200, message: '登出成功' })
})

// 更新个人资料
router.put('/user/profile', authMiddleware, async (req, res) => {
  const userId = req.user.id
  const { nickName, phone, email, sex, avatar } = req.body

  try {
    await db.run(
      'UPDATE users SET nick_name = ?, phone = ?, email = ?, sex = ?, avatar = ?, updated_at = NOW() WHERE id = ?'
    , [nickName || '', phone || '', email || '', sex || '', avatar || '', userId])

    res.json({ code: 200, message: '更新成功' })
  } catch (error) {
    console.error('更新个人资料失败:', error.message)
    res.json({ code: 500, message: '更新失败' })
  }
})

// 修改密码
router.put('/user/password', authMiddleware, async (req, res) => {
  const userId = req.user.id
  const user = await getUserById(userId)

  if (!user) return res.json({ code: 401, message: '用户不存在' })

  const { oldPassword, newPassword } = req.body
  if (!oldPassword || !newPassword) {
    return res.json({ code: 400, message: '请填写完整信息' })
  }

  if (!bcrypt.compareSync(oldPassword, user.password)) {
    return res.json({ code: 400, message: '旧密码不正确' })
  }

  try {
    const hashed = bcrypt.hashSync(newPassword, 10)
    await db.run('UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?', [hashed, userId])
    res.json({ code: 200, message: '密码修改成功' })
  } catch (error) {
    console.error('修改密码失败:', error.message)
    res.json({ code: 500, message: '修改失败' })
  }
})

module.exports = router
