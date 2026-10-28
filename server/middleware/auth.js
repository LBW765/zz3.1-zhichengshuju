const { getUserIdByToken, getUserById } = require('../db/helpers')

async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return res.json({ code: 401, message: '未授权，请先登录' })
  }

  const userId = await getUserIdByToken(token)
  if (!userId) {
    return res.json({ code: 401, message: '登录已过期，请重新登录' })
  }

  const user = await getUserById(userId)
  if (!user) {
    return res.json({ code: 401, message: '用户不存在' })
  }

  req.user = user
  req.token = token
  next()
}

function roleMiddleware(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.json({ code: 401, message: '未授权' })
    }
    const userRoles = req.user.roles || []
    const hasRole = userRoles.some(role => allowedRoles.includes(role))
    if (!hasRole) {
      return res.json({ code: 403, message: '权限不足，无法执行此操作' })
    }
    next()
  }
}

module.exports = { authMiddleware, roleMiddleware }
