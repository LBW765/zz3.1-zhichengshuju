const express = require('express')
const crypto = require('crypto')

const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ')
const clone = value => JSON.parse(JSON.stringify(value))

const roles = [
  { id: 1, roleKey: 'administrator', roleName: '超级管理员', description: '系统超级管理员，拥有全部权限', status: 1, sort: 1 },
  { id: 2, roleKey: 'admin', roleName: '管理员', description: '平台管理员，可管理系统基础配置', status: 1, sort: 2 },
  { id: 3, roleKey: 'user', roleName: '普通用户', description: '普通用户，仅可访问个人中心和首页', status: 1, sort: 3 }
]

const menus = [
  { id: 1, parentId: null, name: 'Workspace', path: '/workspace', component: 'Layout', redirect: '/workspace/dashboard', title: '工作台', icon: 'Monitor', layout: 'sidebar', platform: 'app-platform', sort: 1, roles: ['administrator', 'admin', 'user'] },
  { id: 11, parentId: 1, name: 'Dashboard', path: 'dashboard', component: 'dashboard/index', title: '首页看板', icon: 'DataLine', platform: 'app-platform', sort: 1, roles: ['administrator', 'admin', 'user'] },
  { id: 2, parentId: null, name: 'System', path: '/system', component: 'Layout', redirect: '/system/user', title: '系统管理', icon: 'Setting', layout: 'sidebar', platform: 'app-platform', sort: 2, roles: ['administrator', 'admin'] },
  { id: 21, parentId: 2, name: 'User', path: 'user', component: 'system/user/index', title: '用户管理', icon: 'User', platform: 'app-platform', sort: 1, roles: ['administrator', 'admin'] },
  { id: 22, parentId: 2, name: 'Role', path: 'role', component: 'system/role/index', title: '角色管理', icon: 'UserFilled', platform: 'app-platform', sort: 2, roles: ['administrator', 'admin'] },
  { id: 23, parentId: 2, name: 'Department', path: 'department', component: 'system/department/index', title: '部门管理', icon: 'OfficeBuilding', platform: 'app-platform', sort: 3, roles: ['administrator', 'admin'] },
  { id: 24, parentId: 2, name: 'Menu', path: 'menu', component: 'system/menu/index', title: '菜单管理', icon: 'Menu', platform: 'app-platform', sort: 4, roles: ['administrator', 'admin'] },
  { id: 25, parentId: 2, name: 'CodeRule', path: 'code-rule', component: 'code-rule/list/index', title: '编码规则', icon: 'Tickets', platform: 'app-platform', sort: 5, roles: ['administrator', 'admin'] },
  { id: 3, parentId: null, name: 'AdminPlatform', path: '/platform', component: 'Layout', redirect: '/platform/index', title: '平台配置', icon: 'Setting', layout: 'page', platform: 'admin-platform', sort: 1, roles: ['administrator'] },
  { id: 31, parentId: 3, name: 'PlatformConfig', path: 'index', component: 'system/platform/index', title: '平台配置', icon: 'Setting', platform: 'admin-platform', sort: 1, roles: ['administrator'] },
  { id: 4, parentId: null, name: 'BasicData', path: '/basic-data', component: 'Layout', redirect: '/basic-data/material', title: '基础资料', icon: 'Files', layout: 'sidebar', platform: 'app-platform', sort: 3, roles: ['administrator', 'admin'] },
  { id: 41, parentId: 4, name: 'Material', path: 'material', component: 'system/basic-data/material/index', title: '物料档案', icon: 'Box', platform: 'app-platform', sort: 1, roles: ['administrator', 'admin'] },
  { id: 42, parentId: 4, name: 'Process', path: 'process', component: 'system/basic-data/process/index', title: '工序管理', icon: 'Operation', platform: 'app-platform', sort: 2, roles: ['administrator', 'admin'] },
  { id: 43, parentId: 4, name: 'ProcessRoute', path: 'process-route', component: 'system/basic-data/process-route/index', title: '工艺路线', icon: 'Share', platform: 'app-platform', sort: 3, roles: ['administrator', 'admin'] },
  { id: 44, parentId: 4, name: 'Bom', path: 'bom', component: 'system/basic-data/bom/index', title: 'BOM 管理', icon: 'Connection', platform: 'app-platform', sort: 4, roles: ['administrator', 'admin'] },
  { id: 45, parentId: 4, name: 'Workshop', path: 'workshop', component: 'system/basic-data/workshop/index', title: '车间与产线', icon: 'OfficeBuilding', platform: 'app-platform', sort: 5, roles: ['administrator', 'admin'] },
  { id: 46, parentId: 4, name: 'Equipment', path: 'equipment', component: 'system/basic-data/equipment/index', title: '设备档案', icon: 'Cpu', platform: 'app-platform', sort: 6, roles: ['administrator', 'admin'] },
  { id: 47, parentId: 4, name: 'Customer', path: 'customer', component: 'system/basic-data/customer/index', title: '客户管理', icon: 'User', platform: 'app-platform', sort: 7, roles: ['administrator', 'admin'] },
  { id: 48, parentId: 4, name: 'ServiceProvider', path: 'service-provider', component: 'system/basic-data/service-provider/index', title: '服务商管理', icon: 'Service', platform: 'app-platform', sort: 8, roles: ['administrator', 'admin'] },
  { id: 49, parentId: 4, name: 'Unit', path: 'unit', component: 'system/basic-data/unit/index', title: '计量单位', icon: 'ScaleToOriginal', platform: 'app-platform', sort: 9, roles: ['administrator', 'admin'] },
  { id: 5, parentId: null, name: 'SupplyChain', path: '/supply-chain', component: 'Layout', redirect: '/supply-chain/supplier', title: '供应链与经营', icon: 'Goods', layout: 'sidebar', platform: 'app-platform', sort: 4, roles: ['administrator', 'admin'] },
  { id: 51, parentId: 5, name: 'Supplier', path: 'supplier', component: 'supply-chain/supplier/index', title: '供应商管理', icon: 'Van', platform: 'app-platform', sort: 1, roles: ['administrator', 'admin'] },
  { id: 52, parentId: 5, name: 'Warehouse', path: 'warehouse', component: 'supply-chain/warehouse/index', title: '仓库管理', icon: 'House', platform: 'app-platform', sort: 2, roles: ['administrator', 'admin'] }
]

const users = [
  { id: 1, username: 'administrator', password: 'admin123', nickName: '超级管理员', email: 'administrator@system.com', phone: '13800000000', deptName: '系统', roleName: '超级管理员', roles: ['administrator'], permissions: ['*:*:*'], status: 1 },
  { id: 2, username: 'admin', password: 'admin123', nickName: '管理员', email: 'admin@example.com', phone: '13888888888', deptName: '技术部', roleName: '管理员', roles: ['admin'], permissions: ['*:*:*'], status: 1 },
  { id: 3, username: 'user', password: 'admin123', nickName: '普通用户', email: 'user@example.com', phone: '13666666666', deptName: '业务部', roleName: '普通用户', roles: ['user'], permissions: ['dashboard:view'], status: 1 }
]

const departments = [
  { id: 1, deptName: '系统', parentId: 0, sortOrder: 1, status: 1 },
  { id: 2, deptName: '技术部', parentId: 1, sortOrder: 2, status: 1 },
  { id: 3, deptName: '业务部', parentId: 1, sortOrder: 3, status: 1 }
]

const permissions = [
  { id: 1, code: 'dashboard:view', name: '查看仪表盘', description: '查看工作台数据', menuId: 11 },
  { id: 2, code: 'system:user:query', name: '查询用户', description: '查询用户列表', menuId: 21 },
  { id: 3, code: 'system:user:edit', name: '编辑用户', description: '维护用户信息', menuId: 21 },
  { id: 4, code: 'system:menu:query', name: '查询菜单', description: '查询系统菜单', menuId: 24 }
]

const codeRules = [
  { id: 1, code: 'material', name: '物料编码', prefix: 'MAT', enabled: 1, description: '物料档案编号', segments: [] },
  { id: 2, code: 'customer', name: '客户编码', prefix: 'CUS', enabled: 1, description: '客户档案编号', segments: [] },
  { id: 3, code: 'supplier', name: '供应商编码', prefix: 'SUP', enabled: 1, description: '供应商档案编号', segments: [] }
]


const store = {
  users,
  roles,
  departments,
  permissions,
  menus,
  codeRules,
  platformConfig: { platformName: '智城数据运营管理平台', logo: '', primaryColor: '#409EFF', footer: '数据运营管理平台' },
  tokens: new Map(),
  loginRecords: [],
  collections: Object.create(null),
  nextId: 1000
}

const collectionNames = {
  '/customer': 'customers',
  '/basic-data/unit-group': 'unitGroups',
  '/basic-data/unit': 'units',
  '/basic-data/material-category': 'materialCategories',
  '/basic-data/material': 'materials',
  '/basic-data/process': 'processes',
  '/basic-data/process-route': 'processRoutes',
  '/basic-data/bom': 'boms',
  '/basic-data/workshop': 'workshops',
  '/basic-data/supplier-category': 'supplierCategories',
  '/basic-data/equipment-category': 'equipmentCategories',
  '/basic-data/equipment': 'equipments',
  '/basic-data/customer-category': 'customerCategories',
  '/basic-data/service-provider-category': 'serviceProviderCategories',
  '/basic-data/service-provider': 'serviceProviders',
  '/basic-data/attachment': 'attachments',
  '/supply-chain/supplier': 'suppliers',
  '/supply-chain/warehouse': 'warehouses'
}

function getTimeFields(row) {
  const time = now()
  return { createdAt: row.createdAt || time, updatedAt: row.updatedAt || time, created_at: row.created_at || time, updated_at: row.updated_at || time }
}

function createRecord(key, source = {}, id = store.nextId++) {
  const index = (store.collections[key] || []).length + 1
  const names = {
    units: ['计量单位', 'unit'], materials: ['物料', 'material'], materialCategories: ['物料分类', 'materialCategory'],
    processes: ['工序', 'process'], processRoutes: ['工艺路线', 'processRoute'], boms: ['BOM', 'bom'], workshops: ['一号车间', 'workshop'],
    equipmentCategories: ['设备分类', 'equipmentCategory'], equipments: ['设备', 'equipment'], customerCategories: ['客户分类', 'customerCategory'],
    customers: ['客户', 'customer'], supplierCategories: ['供应商分类', 'supplierCategory'], suppliers: ['供应商', 'supplier'],
    serviceProviderCategories: ['服务商分类', 'serviceProviderCategory'], serviceProviders: ['服务商', 'serviceProvider'], warehouses: ['仓库', 'warehouse'],
    unitGroups: ['计量单位组', 'unitGroup'], attachments: ['附件', 'attachment']
  }
  const [label, codeKey] = names[key] || [key, key]
  const row = {
    id, name: source.name || `${label}${index}`, label: source.label || source.name || `${label}${index}`,
    code: source.code || source[`${codeKey}Code`] || `${codeKey.toUpperCase()}-${String(index).padStart(3, '0')}`,
    status: source.status === undefined ? 1 : source.status, sort: source.sort || index,
    remark: source.remark || '', parentId: source.parentId || null, createdBy: 1,
    ...getTimeFields(source), ...source
  }
  if (key === 'materials') Object.assign(row, { materialCode: row.materialCode || row.code, materialName: row.materialName || row.name, sourceType: row.sourceType || '自制', categoryId: row.categoryId || null })
  if (key === 'processes') Object.assign(row, { processCode: row.processCode || row.code, processName: row.processName || row.name })
  if (key === 'processRoutes') Object.assign(row, { routeCode: row.routeCode || row.code, routeName: row.routeName || row.name })
  if (key === 'customers') Object.assign(row, { customerNo: row.customerNo || row.code, customerName: row.customerName || row.name, categoryId: row.categoryId || null })
  if (key === 'suppliers') Object.assign(row, { supplierNo: row.supplierNo || row.code, supplierName: row.supplierName || row.name })
  if (key === 'warehouses') Object.assign(row, { warehouseCode: row.warehouseCode || row.code, warehouseName: row.warehouseName || row.name, address: row.address || '' })
  if (key === 'equipments') Object.assign(row, { equipmentCode: row.equipmentCode || row.code, equipmentName: row.equipmentName || row.name, categoryId: row.categoryId || null })
  if (key === 'serviceProviders') Object.assign(row, { providerCode: row.providerCode || row.code, providerName: row.providerName || row.name })
  return row
}

function collectionForRoot(root) {
  const key = collectionNames[root]
  if (!key) return null
  if (!store.collections[key]) store.collections[key] = [createRecord(key), createRecord(key), createRecord(key)]
  return key
}

function apiMenu(menu) {
  return { ...clone(menu), meta: { title: menu.title, icon: menu.icon, layout: menu.layout || '', platform: menu.platform, roles: menu.roles, affix: !!menu.affix, hidden: !!menu.hidden } }
}

function apiUser(user) {
  return { id: user.id, userId: user.id, userName: user.username, username: user.username, nickName: user.nickName, email: user.email, phone: user.phone, avatar: user.avatar || '', deptName: user.deptName, roleName: user.roleName, roles: clone(user.roles), status: user.status, createTime: user.createdAt || now() }
}

function parsePage(query) {
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize || query.limit) || 10))
  return { page, pageSize }
}

function filterRows(rows, query) {
  const keyword = String(query.keyword || query.search || '').trim().toLowerCase()
  let result = rows
  if (keyword) result = result.filter(row => Object.values(row).some(value => String(value ?? '').toLowerCase().includes(keyword)))
  if (query.status !== undefined && query.status !== '') result = result.filter(row => Number(row.status) === Number(query.status))
  return result
}

function listData(rows, query) {
  const { page, pageSize } = parsePage(query)
  const filtered = filterRows(rows, query)
  const start = (page - 1) * pageSize
  return { list: clone(filtered.slice(start, start + pageSize)), total: filtered.length, page, pageSize }
}

function arrayDataFor(path) {
  return path === '/basic-data/workshop' || /\/(options|available-users|employee-options|user-options|locations|members)$/.test(path)
}

function findRoot(path) {
  const roots = Object.keys(collectionNames).sort((a, b) => b.length - a.length)
  return roots.find(root => path === root || path.startsWith(`${root}/`)) || null
}

function buildDepartmentTree(rows) {
  const map = new Map(rows.map(row => [row.id, { ...clone(row), children: [] }]))
  const result = []
  map.forEach(row => {
    if (!row.parentId || !map.has(row.parentId)) result.push(row)
    else map.get(row.parentId).children.push(row)
  })
  return result
}

function userFromToken(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  const userId = store.tokens.get(token)
  return userId ? store.users.find(user => user.id === userId) : null
}

function ok(res, data, message = '获取成功') {
  return res.json({ code: 200, message, data })
}

function error(res, code, message) {
  return res.json({ code, message })
}

function makeMockRecord(key, body) {
  const row = createRecord(key, body)
  if (!store.collections[key]) store.collections[key] = []
  store.collections[key].push(row)
  return row
}

function createMockRouter() {
  const router = express.Router()

  router.post('/login', (req, res) => {
    const username = String(req.body?.username || '').trim()
    const user = store.users.find(item => item.username === username)
    if (!user || user.password !== req.body?.password) return error(res, 401, '用户名或密码错误')
    if (!user.status) return error(res, 403, '账号已被禁用')
    const token = `mock-${user.id}-${crypto.randomBytes(8).toString('hex')}`
    store.tokens.set(token, user.id)
    store.loginRecords.unshift({ username, loginTime: now(), ip: '127.0.0.1' })
    return ok(res, { token }, '登录成功')
  })

  router.post('/logout', (req, res) => {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
    if (token) store.tokens.delete(token)
    return ok(res, null, '登出成功')
  })

  router.use((req, res, next) => {
    const user = userFromToken(req)
    if (!user) return error(res, 401, '未授权，请先登录')
    req.mockUser = user
    next()
  })

  router.get('/user/info', (req, res) => ok(res, { user: apiUser(req.mockUser), roles: clone(req.mockUser.roles), permissions: clone(req.mockUser.permissions) }))

  router.put('/user/profile', (req, res) => {
    Object.assign(req.mockUser, { nickName: req.body.nickName ?? req.mockUser.nickName, phone: req.body.phone ?? req.mockUser.phone, email: req.body.email ?? req.mockUser.email, sex: req.body.sex ?? req.mockUser.sex, avatar: req.body.avatar ?? req.mockUser.avatar })
    return ok(res, null, '更新成功')
  })

  router.put('/user/password', (req, res) => {
    if (!req.body.oldPassword || !req.body.newPassword) return error(res, 400, '请填写完整信息')
    if (req.mockUser.password !== req.body.oldPassword) return error(res, 400, '旧密码不正确')
    req.mockUser.password = req.body.newPassword
    return ok(res, null, '密码修改成功')
  })

  router.get('/dashboard/stats', (req, res) => ok(res, { userCount: store.users.length, menuCount: store.menus.length, roleCount: store.roles.length, todayLoginCount: store.loginRecords.length }))
  router.get('/dashboard/system-stats', (req, res) => ok(res, { cpu: 18, memory: 42, disk: 36, onlineUsers: store.tokens.size }))
  router.get('/dashboard/login-records', (req, res) => ok(res, clone(store.loginRecords.slice(0, 10))))
  router.get('/dashboard/widgets', (req, res) => ok(res, { widgets: ['system-monitor', 'data-stats', 'login-records', 'quick-actions'] }))

  router.get('/menus/accessible', (req, res) => {
    const accessible = store.menus.filter(menu => menu.roles.some(role => req.mockUser.roles.includes(role))).sort((a, b) => (a.sort || 0) - (b.sort || 0) || a.id - b.id)
    return ok(res, accessible.map(apiMenu))
  })

  router.get('/menus', (req, res) => ok(res, store.menus.map(apiMenu)))
  router.get('/menus/:id/buttons', (req, res) => ok(res, permissions.filter(item => item.menuId === Number(req.params.id))))
  router.post('/menus', (req, res) => {
    const id = store.nextId++
    const meta = req.body.meta || {}
    const menu = { id, parentId: req.body.parentId || null, name: req.body.name || `Menu${id}`, path: req.body.path || `entry-${id}`, component: req.body.component || '', redirect: req.body.redirect || '', title: meta.title || req.body.title || '新菜单', icon: meta.icon || '', layout: meta.layout || '', platform: meta.platform || 'app-platform', sort: Number(req.body.sort) || id, roles: meta.roles || ['administrator', 'admin'] }
    store.menus.push(menu)
    return ok(res, { id }, '添加成功')
  })
  router.put('/menus/:id', (req, res) => {
    const menu = store.menus.find(item => item.id === Number(req.params.id))
    if (!menu) return error(res, 404, '菜单不存在')
    const meta = req.body.meta || {}
    Object.assign(menu, { title: meta.title ?? menu.title, icon: meta.icon ?? menu.icon, sort: req.body.sort ?? menu.sort, hidden: meta.hidden ?? menu.hidden, affix: meta.affix ?? menu.affix })
    return ok(res, apiMenu(menu), '更新成功')
  })
  router.post('/menus/:id/publish', (req, res) => ok(res, { id: store.nextId++ }, '发布成功'))
  router.delete('/menus/:id', (req, res) => {
    const id = Number(req.params.id)
    const index = store.menus.findIndex(item => item.id === id)
    if (index < 0) return error(res, 404, '菜单不存在')
    store.menus.splice(index, 1)
    return ok(res, null, '删除成功')
  })

  router.get('/system/users', (req, res) => {
    const rows = filterRows(store.users, req.query).map(apiUser)
    return ok(res, listData(rows, req.query))
  })
  router.post('/system/users', (req, res) => {
    const username = String(req.body.username || '').trim()
    if (!username || store.users.some(item => item.username === username)) return error(res, 400, '用户名不能为空或已存在')
    const roleKeys = Array.isArray(req.body.roles) && req.body.roles.length ? req.body.roles : ['user']
    const row = { id: store.nextId++, username, password: req.body.password || 'admin123', nickName: req.body.nickName || username, email: req.body.email || '', phone: req.body.phone || '', deptName: req.body.deptName || '', roleName: roleKeys.join('、'), roles: roleKeys, permissions: roleKeys.includes('user') ? ['dashboard:view'] : ['*:*:*'], status: req.body.status === undefined ? 1 : req.body.status }
    store.users.push(row)
    return ok(res, { id: row.id }, '添加成功')
  })
  router.put('/system/users/:id', (req, res) => updateUser(req, res, false))
  router.put('/system/users/:id/status', (req, res) => updateUser(req, res, true))
  router.put('/system/users/:id/reset-password', (req, res) => {
    const user = store.users.find(item => item.id === Number(req.params.id))
    if (!user) return error(res, 404, '用户不存在')
    user.password = req.body.password || 'admin123'
    return ok(res, null, '密码重置成功')
  })
  router.delete('/system/users/:id', (req, res) => deleteFrom(store.users, req, res, '用户不存在'))

  router.get('/system/roles', (req, res) => {
    const rows = filterRows(store.roles, req.query).map(role => ({ ...clone(role), userCount: store.users.filter(user => user.roles.includes(role.roleKey)).length }))
    return ok(res, listData(rows, req.query))
  })
  router.get('/system/roles/all', (req, res) => ok(res, store.roles.filter(role => role.status).map(role => ({ id: role.id, roleKey: role.roleKey, roleName: role.roleName, description: role.description, status: role.status, sort: role.sort }))))
  router.post('/system/roles', (req, res) => {
    const role = { id: store.nextId++, roleKey: req.body.roleKey || `role_${store.nextId}`, roleName: req.body.roleName || '新角色', description: req.body.description || '', status: req.body.status === undefined ? 1 : req.body.status, sort: req.body.sort || store.roles.length + 1 }
    store.roles.push(role)
    return ok(res, { id: role.id }, '添加成功')
  })
  router.put('/system/roles/:id', (req, res) => updateEntity(store.roles, req, res, { roleName: 'roleName', description: 'description', status: 'status', sort: 'sort' }))
  router.put('/system/roles/:id/status', (req, res) => updateEntity(store.roles, req, res, { status: 'status' }))
  router.delete('/system/roles/:id', (req, res) => deleteFrom(store.roles, req, res, '角色不存在'))
  router.get('/system/roles/:id/menus', (req, res) => ok(res, { menuIds: store.menus.filter(menu => menu.roles.includes(store.roles.find(role => role.id === Number(req.params.id))?.roleKey)).map(menu => menu.id) }))
  router.put('/system/roles/:id/menus', (req, res) => ok(res, null, '菜单权限更新成功'))
  router.get('/system/roles/:id/permissions', (req, res) => ok(res, { permissionIds: permissions.map(item => item.id) }))
  router.put('/system/roles/:id/permissions', (req, res) => ok(res, null, '按钮权限更新成功'))
  router.get('/system/roles/:id/data-scope', (req, res) => ok(res, { scope: 'all', menuScopes: {} }))
  router.put('/system/roles/:id/data-scope', (req, res) => ok(res, null, '数据权限更新成功'))

  router.get('/system/departments', (req, res) => ok(res, buildDepartmentTree(departments)))
  router.post('/system/departments', (req, res) => {
    const row = { id: store.nextId++, deptName: req.body.deptName || '新部门', parentId: req.body.parentId || 0, sortOrder: req.body.sortOrder || 0, status: req.body.status === undefined ? 1 : req.body.status }
    departments.push(row)
    return ok(res, row, '添加成功')
  })
  router.put('/system/departments/:id', (req, res) => updateEntity(departments, req, res, { deptName: 'deptName', parentId: 'parentId', sortOrder: 'sortOrder', status: 'status' }))
  router.delete('/system/departments/:id', (req, res) => deleteFrom(departments, req, res, '部门不存在'))

  router.get(['/permissions', '/system/permissions'], (req, res) => ok(res, listData(permissions, req.query)))
  router.post(['/permissions', '/system/permissions'], (req, res) => { const row = { id: store.nextId++, ...req.body }; permissions.push(row); return ok(res, { id: row.id }, '添加成功') })
  router.put(['/permissions/:id', '/system/permissions/:id'], (req, res) => updateEntity(permissions, req, res, req.body))
  router.delete(['/permissions/:id', '/system/permissions/:id'], (req, res) => deleteFrom(permissions, req, res, '权限不存在'))

  router.get('/system/platform/config', (req, res) => ok(res, clone(store.platformConfig)))
  router.put('/system/platform/config', (req, res) => { Object.assign(store.platformConfig, req.body); return ok(res, clone(store.platformConfig), '更新成功') })
  router.post('/system/upload', (req, res) => ok(res, { url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="120" height="120"%3E%3Crect width="120" height="120" fill="%23409EFF"/%3E%3C/svg%3E', name: 'mock-upload.svg' }, '上传成功'))

  router.get('/code-rule', (req, res) => ok(res, listData(codeRules, req.query)))
  router.get('/code-rule/next-code/:code', (req, res) => ok(res, { code: `${String(req.params.code).toUpperCase()}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-001` }))
  router.post('/code-rule/preview', (req, res) => ok(res, { preview: `${String(req.body?.code || req.body?.ruleCode || 'CODE').toUpperCase()}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-001` }))
  router.get('/code-rule/:id', (req, res) => { const row = codeRules.find(item => item.id === Number(req.params.id)); return row ? ok(res, row) : error(res, 404, '编码规则不存在') })
  router.post('/code-rule', (req, res) => { const row = { id: store.nextId++, ...req.body, enabled: req.body.enabled === undefined ? 1 : req.body.enabled, segments: req.body.segments || [] }; codeRules.push(row); return ok(res, { id: row.id }, '添加成功') })
  router.put('/code-rule/:id/toggle', (req, res) => { const row = codeRules.find(item => item.id === Number(req.params.id)); if (!row) return error(res, 404, '编码规则不存在'); row.enabled = row.enabled ? 0 : 1; return ok(res, row, '状态更新成功') })
  router.put('/code-rule/:id', (req, res) => updateEntity(codeRules, req, res, req.body))
  router.delete('/code-rule/:id', (req, res) => deleteFrom(codeRules, req, res, '编码规则不存在'))

  router.all('*', (req, res) => handleGeneric(req, res))
  return router
}

function updateUser(req, res, statusOnly) {
  const user = store.users.find(item => item.id === Number(req.params.id))
  if (!user) return error(res, 404, '用户不存在')
  if (statusOnly) user.status = req.body.status === undefined ? user.status : req.body.status
  else Object.assign(user, { nickName: req.body.nickName ?? user.nickName, email: req.body.email ?? user.email, phone: req.body.phone ?? user.phone, deptName: req.body.deptName ?? user.deptName, status: req.body.status ?? user.status, roles: req.body.roles ?? user.roles, roleName: req.body.roleName ?? user.roleName })
  return ok(res, apiUser(user), '更新成功')
}

function updateEntity(rows, req, res, fields) {
  const row = rows.find(item => item.id === Number(req.params.id))
  if (!row) return error(res, 404, '记录不存在')
  Object.keys(fields).forEach(key => { if (req.body[key] !== undefined) row[key] = req.body[key] })
  Object.keys(req.body).forEach(key => { if (!fields || fields[key]) row[key] = req.body[key] })
  row.updatedAt = now()
  return ok(res, clone(row), '更新成功')
}

function deleteFrom(rows, req, res, message) {
  const index = rows.findIndex(item => item.id === Number(req.params.id))
  if (index < 0) return error(res, 404, message)
  rows.splice(index, 1)
  return ok(res, null, '删除成功')
}

function handleGeneric(req, res) {
  const path = req.path.replace(/\/$/, '') || '/'
  const root = findRoot(path)
  if (!root) return ok(res, req.method === 'GET' ? [] : {}, '操作成功')
  const key = collectionForRoot(root)
  const suffix = path.slice(root.length).replace(/^\//, '')
  const parts = suffix ? suffix.split('/') : []
  const id = parts[0] && /^\d+$/.test(parts[0]) ? Number(parts[0]) : null
  const action = parts[id === null ? 0 : 1]
  const rows = store.collections[key]

  if (req.method === 'GET') {
    if (path === '/basic-data/workshop/user-options' || path === '/basic-data/workshop/employee-options') return ok(res, store.users.map(user => ({ id: user.id, name: user.nickName, label: user.nickName, value: user.id })))
    if (root === '/basic-data/workshop' && parts.length === 0) return ok(res, rows)
    if (id !== null) {
      const row = rows.find(item => item.id === id) || createRecord(key, {}, id)
      if (parts.includes('lines')) return ok(res, { ...clone(row), lines: [{ id: store.nextId++, lineCode: 'LINE-001', lineName: '示范产线', teams: [] }] })
      if (parts.includes('areas')) return ok(res, { areas: [{ id: store.nextId++, areaName: '原料区', areaCode: 'A-01' }] })
      if (parts.includes('locations')) return ok(res, [{ id: store.nextId++, locationCode: 'A-01-01', locationName: '一号库位' }])
      if (parts.includes('tree') || parts.includes('items') || parts.includes('hints')) return ok(res, [])
      return ok(res, clone(row))
    }
    if (arrayDataFor(path)) return ok(res, rows)
    return ok(res, listData(rows, req.query))
  }

  if (req.method === 'POST' && (suffix === 'import' || suffix.endsWith('/import'))) {
    const input = Array.isArray(req.body?.rows) ? req.body.rows : []
    input.forEach(item => makeMockRecord(key, item))
    return ok(res, { total: input.length, success: input.length, failed: 0, errors: [] }, '导入成功')
  }
  if (req.method === 'POST' && id === null) return ok(res, makeMockRecord(key, req.body || {}), '添加成功')
  if (req.method === 'PUT' && id !== null) {
    const row = rows.find(item => item.id === id)
    if (!row) return error(res, 404, '记录不存在')
    Object.assign(row, req.body || {}, action === 'status' ? { status: req.body.status } : {})
    row.updatedAt = now()
    return ok(res, clone(row), '更新成功')
  }
  if (req.method === 'DELETE' && id !== null) return deleteFrom(rows, req, res, '记录不存在')
  if (req.method === 'POST' || req.method === 'PUT') return ok(res, { id: id || store.nextId++ }, '操作成功')
  return ok(res, {})
}

module.exports = { createMockRouter }
