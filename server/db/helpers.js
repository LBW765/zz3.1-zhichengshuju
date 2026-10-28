const { db } = require('./index')

const TOKEN_EXPIRE_HOURS = 24

async function getUserById(id) {
  const user = await db.get('SELECT * FROM users WHERE id = ?', [id])
  if (!user) return null
  const roles = (await db.all('SELECT role FROM user_roles WHERE user_id = ?', [id])).map(r => r.role)
  const permissions = (await db.all('SELECT permission FROM user_permissions WHERE user_id = ?', [id])).map(p => p.permission)
  return { ...user, roles, permissions }
}

async function getUserByUsername(username) {
  const user = await db.get('SELECT * FROM users WHERE username = ?', [username])
  if (!user) return null
  return getUserById(user.id)
}

async function createToken(userId, username) {
  const token = `token-${username}-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRE_HOURS * 60 * 60 * 1000).toISOString()
  await db.run('INSERT INTO tokens (token, user_id, expires_at) VALUES (?, ?, ?)', [token, userId, expiresAt])
  return token
}

async function getUserIdByToken(token) {
  const row = await db.get('SELECT user_id, expires_at FROM tokens WHERE token = ?', [token])
  if (!row) return null
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    await db.run('DELETE FROM tokens WHERE token = ?', [token])
    return null
  }
  return row.user_id
}

async function deleteToken(token) {
  await db.run('DELETE FROM tokens WHERE token = ?', [token])
}

async function cleanExpiredTokens() {
  const result = await db.run("DELETE FROM tokens WHERE expires_at != '' AND expires_at < NOW()")
  if (result.affectedRows > 0) {
    console.log(`已清理 ${result.affectedRows} 个过期 token`)
  }
}

function dbMenuToApiMenu(row) {
  return {
    id: row.id,
    parentId: row.parent_id,
    sourceMenuId: row.source_menu_id || null,
    name: row.name,
    path: row.path,
    component: row.component,
    redirect: row.redirect || undefined,
    meta: {
      title: row.title,
      icon: row.icon,
      layout: row.layout || undefined,
      platform: row.platform,
      affix: !!row.affix,
      hidden: !!row.hidden,
      alwaysShow: row.name === 'ProductionScheduling',
      roles: JSON.parse(row.roles || '[]')
    },
    sort: row.sort
  }
}

async function dbUserToApiUser(user) {
  let deptId = user.dept_id || null
  if (!deptId && user.dept_name) {
    const dept = await db.get('SELECT id FROM departments WHERE dept_name = ? LIMIT 1', [user.dept_name])
    deptId = dept?.id || null
  }
  return {
    id: user.id,
    username: user.username,
    nickName: user.nick_name,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar,
    deptId,
    deptName: user.dept_name,
    roleName: user.role_name,
    accountType: user.account_type || 'internal',
    relatedPartyType: user.related_party_type || '',
    relatedPartyId: user.related_party_id || null,
    status: user.status,
    roles: user.roles || [],
    createdAt: user.created_at,
    updatedAt: user.updated_at
  }
}

module.exports = {
  getUserById,
  getUserByUsername,
  createToken,
  getUserIdByToken,
  deleteToken,
  cleanExpiredTokens,
  dbMenuToApiMenu,
  dbUserToApiUser,
  TOKEN_EXPIRE_HOURS
}
