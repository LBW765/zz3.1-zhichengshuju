const bcrypt = require('bcryptjs')

const roles = [
  {
    roleName: '超级管理员',
    roleKey: 'administrator',
    description: '系统超级管理员，拥有全部权限',
    status: 1,
    sort: 1
  },
  {
    roleName: '管理员',
    roleKey: 'admin',
    description: '平台管理员，可管理系统基础配置',
    status: 1,
    sort: 2
  },
  {
    roleName: '普通用户',
    roleKey: 'user',
    description: '普通用户，仅可访问个人中心和首页',
    status: 1,
    sort: 3
  }
]

const users = [
  {
    username: 'administrator',
    password: 'admin123',
    nickName: '超级管理员',
    email: 'administrator@system.com',
    phone: '13800000000',
    deptName: '系统',
    roleName: '超级管理员',
    roles: ['administrator'],
    permissions: ['*:*:*']
  },
  {
    username: 'admin',
    password: 'admin123',
    nickName: '管理员',
    email: 'admin@example.com',
    phone: '13888888888',
    deptName: '技术部',
    roleName: '管理员',
    roles: ['admin'],
    permissions: ['*:*:*']
  },
  {
    username: 'user',
    password: 'admin123',
    nickName: '普通用户',
    email: 'user@example.com',
    phone: '13666666666',
    deptName: '业务部',
    roleName: '普通用户',
    roles: ['user'],
    permissions: ['dashboard:view']
  }
]

const menus = [
  { id: 1, parentId: null, name: 'Workspace', path: '/workspace', component: 'Layout', redirect: '/workspace/dashboard', title: '工作台', icon: 'Monitor', layout: 'sidebar', platform: 'app-platform', affix: 0, hidden: 0, sort: 1, roles: ['administrator', 'admin', 'user'] },
  { id: 11, parentId: 1, name: 'Dashboard', path: 'dashboard', component: 'dashboard/index', redirect: '', title: '首页看板', icon: 'DataLine', layout: '', platform: 'app-platform', affix: 1, hidden: 0, sort: 1, roles: ['administrator', 'admin', 'user'] },
  { id: 2, parentId: null, name: 'System', path: '/system', component: 'Layout', redirect: '/system/user', title: '系统管理', icon: 'Setting', layout: 'sidebar', platform: 'app-platform', affix: 0, hidden: 0, sort: 2, roles: ['administrator', 'admin'] },
  { id: 21, parentId: 2, name: 'User', path: 'user', component: 'system/user/index', redirect: '', title: '用户管理', icon: 'User', layout: '', platform: 'app-platform', affix: 0, hidden: 0, sort: 1, roles: ['administrator', 'admin'] },
  { id: 22, parentId: 2, name: 'Role', path: 'role', component: 'system/role/index', redirect: '', title: '角色管理', icon: 'UserFilled', layout: '', platform: 'app-platform', affix: 0, hidden: 0, sort: 2, roles: ['administrator', 'admin'] },
  { id: 23, parentId: 2, name: 'Department', path: 'department', component: 'system/department/index', redirect: '', title: '部门管理', icon: 'OfficeBuilding', layout: '', platform: 'app-platform', affix: 0, hidden: 0, sort: 3, roles: ['administrator', 'admin'] },
  { id: 24, parentId: 2, name: 'Menu', path: 'menu', component: 'system/menu/index', redirect: '', title: '菜单管理', icon: 'Menu', layout: '', platform: 'app-platform', affix: 0, hidden: 0, sort: 4, roles: ['administrator', 'admin'] },
  { id: 25, parentId: 2, name: 'CodeRule', path: 'code-rule', component: 'code-rule/list/index', redirect: '', title: '编码规则', icon: 'Tickets', layout: '', platform: 'app-platform', affix: 0, hidden: 0, sort: 5, roles: ['administrator', 'admin'] },
  { id: 3, parentId: null, name: 'AdminPlatform', path: '/platform', component: 'Layout', redirect: '/platform/index', title: '平台配置', icon: 'Setting', layout: 'page', platform: 'admin-platform', affix: 0, hidden: 0, sort: 1, roles: ['administrator'] },
  { id: 31, parentId: 3, name: 'PlatformConfig', path: 'index', component: 'system/platform/index', redirect: '', title: '平台配置', icon: 'Setting', layout: '', platform: 'admin-platform', affix: 0, hidden: 0, sort: 1, roles: ['administrator'] }
]

async function seedData(db) {
  const row = await db.get('SELECT COUNT(*) AS count FROM users')
  if (row.count > 0) return

  await db.transaction(async (conn) => {
    for (const role of roles) {
      await conn.run(
        'INSERT IGNORE INTO roles (role_name, role_key, description, status, sort) VALUES (?, ?, ?, ?, ?)',
        [role.roleName, role.roleKey, role.description, role.status, role.sort]
      )
    }

    for (const user of users) {
      const result = await conn.run(
        'INSERT INTO users (username, password, nick_name, email, phone, dept_name, role_name) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [user.username, bcrypt.hashSync(user.password, 10), user.nickName, user.email, user.phone, user.deptName, user.roleName]
      )
      for (const role of user.roles) {
        await conn.run('INSERT INTO user_roles (user_id, role) VALUES (?, ?)', [result.insertId, role])
      }
      for (const permission of user.permissions) {
        await conn.run('INSERT INTO user_permissions (user_id, permission) VALUES (?, ?)', [result.insertId, permission])
      }
    }

    for (const menu of menus) {
      await conn.run(
        `INSERT INTO menus
          (id, parent_id, name, path, component, redirect, title, icon, layout, platform, affix, hidden, sort, roles)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          menu.id,
          menu.parentId,
          menu.name,
          menu.path,
          menu.component,
          menu.redirect,
          menu.title,
          menu.icon,
          menu.layout,
          menu.platform,
          menu.affix,
          menu.hidden,
          menu.sort,
          JSON.stringify(menu.roles)
        ]
      )
    }
  })
}

module.exports = seedData
