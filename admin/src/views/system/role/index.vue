<template>
  <div class="role-manage-container page-shell">
    <!-- PageHeader -->
    <PageHeader title="角色管理" description="管理系统角色，分配菜单权限" class="page-shell__section">
      <template #extra>
        <el-button :icon="Refresh" @click="fetchRoles">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="showAddDialog">新增角色</el-button>
      </template>
    </PageHeader>

    <!-- 搜索工具栏 -->
    <el-card shadow="never" class="toolbar-card page-card page-shell__section page-toolbar">
      <div class="toolbar-row page-toolbar__row">
        <div class="page-toolbar__filters">
          <el-input v-model="searchKeyword" placeholder="搜索角色标识 / 角色名称" clearable :prefix-icon="Search" style="width: 280px" @keyup.enter="handleSearch" />
          <el-select v-model="statusFilter" placeholder="状态" clearable style="width: 120px">
            <el-option label="启用" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
        </div>
        <div class="page-toolbar__actions">
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button :icon="Refresh" @click="resetSearch">重置</el-button>
        </div>
      </div>
    </el-card>

    <!-- 表格 -->
    <el-card shadow="never" class="page-card page-shell__section table-page-card">
      <div class="table-shell">
        <el-table :data="roleList" v-loading="loading" stripe :fit="false">
          <el-table-column prop="roleKey" label="角色标识" min-width="120" show-overflow-tooltip />
          <el-table-column prop="roleName" label="角色名称" min-width="120" show-overflow-tooltip />
          <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
          <el-table-column label="用户数" width="90" align="center">
            <template #default="{ row }">
              <el-tag size="small">{{ row.userCount || 0 }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-switch v-model="row.status" :active-value="1" :inactive-value="0" :disabled="row.roleKey === 'administrator'" @change="(val) => handleStatusChange(row, val)" />
            </template>
          </el-table-column>
          <el-table-column prop="sort" label="排序" width="80" align="center" />
          <el-table-column prop="createdAt" label="创建时间" min-width="180" />
          <el-table-column label="操作" width="220" fixed="right" align="left">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button type="primary" link @click="editRole(row)">编辑</el-button>
                <el-button type="warning" link :disabled="row.roleKey === 'administrator'" @click="showPermConfigDialog(row)">权限配置</el-button>
                <el-button type="danger" link :disabled="row.roleKey === 'administrator'" @click="handleDelete(row)">删除</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div class="pagination-wrapper">
        <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize" :page-sizes="[10, 20, 50]" :total="total" layout="total, sizes, prev, pager, next, jumper" @size-change="handleSizeChange" @current-change="handlePageChange" />
      </div>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="editingRole ? '编辑角色' : '新增角色'" width="500px" :close-on-click-modal="false" @closed="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="角色标识" prop="roleKey">
          <el-input v-model="form.roleKey" placeholder="请输入角色标识，如 editor" :disabled="!!editingRole" />
        </el-form-item>
        <el-form-item label="角色名称" prop="roleName">
          <el-input v-model="form.roleName" placeholder="请输入角色名称" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入角色描述" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="排序" prop="sort">
              <el-input-number v-model="form.sort" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveRole">保存</el-button>
      </template>
    </el-dialog>

    <!-- 权限配置弹窗 -->
    <el-dialog v-model="permConfigDialogVisible" :title="`权限配置 - ${currentConfigRole?.roleName || ''}`" width="760px" :close-on-click-modal="false">
      <el-tabs v-model="activePermTab" v-loading="permConfigLoading">
        <!-- Tab 1: 菜单权限 -->
        <el-tab-pane label="菜单权限" name="menu">
          <div style="margin-bottom: 12px; display: flex; gap: 8px;">
            <el-button size="small" @click="checkAllMenus">全选</el-button>
            <el-button size="small" @click="uncheckAllMenus">取消全选</el-button>
          </div>
          <div class="perm-tree-container">
            <el-tree
              ref="menuTreeRef"
              :data="menuTreeData"
              show-checkbox
              node-key="id"
              :props="{ label: 'label', children: 'children' }"
              default-expand-all
            />
          </div>
        </el-tab-pane>

        <!-- Tab 2: 按钮权限 -->
        <el-tab-pane label="按钮权限" name="button">
          <el-alert
            title="提示：只显示已勾选菜单的按钮权限"
            type="info"
            :closable="false"
            style="margin-bottom: 12px"
          />
          <div class="perm-tree-container">
            <el-tree
              ref="buttonPermTreeRef"
              :data="filteredButtonPermTreeData"
              show-checkbox
              node-key="id"
              :props="{ label: 'label', children: 'children' }"
              default-expand-all
            />
          </div>
        </el-tab-pane>

        <!-- Tab 3: 数据权限 -->
        <el-tab-pane label="数据权限" name="data">
          <div class="data-scope-container">
            <el-alert
              title="提示：只显示已勾选菜单的数据权限配置"
              type="info"
              :closable="false"
              style="margin-bottom: 16px"
            />
            <el-table :data="filteredMenuDataScopeList" stripe :fit="false" max-height="400">
              <el-table-column prop="menuName" label="菜单名称" min-width="180" show-overflow-tooltip />
              <el-table-column label="数据范围" min-width="280">
                <template #default="{ row }">
                  <el-select v-model="row.scope" placeholder="请选择数据范围" style="width: 100%">
                    <el-option label="全部数据" value="all" />
                    <el-option label="本部门数据" value="department" />
                    <el-option label="本人数据" value="self" />
                    <el-option label="自定义条件" value="custom" />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column label="自定义条件" min-width="120" align="center">
                <template #default="{ row }">
                  <el-button
                    v-if="row.scope === 'custom'"
                    link
                    type="primary"
                    @click="showConditionBuilder(row)"
                  >
                    配置条件
                  </el-button>
                  <span v-else style="color: var(--text-light)">-</span>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>
      </el-tabs>
      <template #footer>
        <el-button @click="permConfigDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="savePermConfig">保存</el-button>
      </template>
    </el-dialog>

    <!-- 部门选择弹窗 -->
    <el-dialog v-model="deptSelectorVisible" title="选择部门" width="500px" :close-on-click-modal="false">
      <el-tree
        ref="deptTreeRef"
        :data="deptTreeData"
        show-checkbox
        node-key="id"
        :props="{ label: 'name', children: 'children' }"
        default-expand-all
      />
      <template #footer>
        <el-button @click="deptSelectorVisible = false">取消</el-button>
        <el-button type="primary" @click="saveDeptSelection">确定</el-button>
      </template>
    </el-dialog>

    <!-- 条件构建器弹窗 -->
    <el-dialog v-model="conditionBuilderVisible" title="配置自定义条件" width="800px" :close-on-click-modal="false">
      <ConditionBuilder
        v-model="currentConditions"
        :fields="conditionFields"
      />
      <template #footer>
        <el-button @click="conditionBuilderVisible = false">取消</el-button>
        <el-button type="primary" @click="saveConditions">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus } from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader/index.vue'
import ConditionBuilder from '@/components/ConditionBuilder/index.vue'
import { getRoleList, createRole, updateRole, deleteRole, updateRoleStatus, getRoleMenus, setRoleMenus, getRolePermissions, updateRolePermissions, getRoleDataScope, updateRoleDataScope } from '@/api/role'
import { getMenus } from '@/api/menu'
import { getPermissions } from '@/api/permission'
import { getDepartments } from '@/api/department'

// 列表相关
const roleList = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const loading = ref(false)

// 搜索筛选
const searchKeyword = ref('')
const statusFilter = ref('')

// 弹窗相关
const dialogVisible = ref(false)
const editingRole = ref(null)
const formRef = ref(null)

function createDefaultForm() {
  return {
    roleKey: '',
    roleName: '',
    description: '',
    sort: 0,
    status: 1
  }
}
const form = ref(createDefaultForm())

const rules = {
  roleKey: [{ required: true, message: '请输入角色标识', trigger: 'blur' }],
  roleName: [{ required: true, message: '请输入角色名称', trigger: 'blur' }]
}

// 菜单权限弹窗相关
const menuTreeRef = ref(null)
const menuTreeData = ref([])

// 权限配置弹窗相关
const permConfigDialogVisible = ref(false)
const permConfigLoading = ref(false)
const activePermTab = ref('menu')
const currentConfigRole = ref(null)

// 按钮权限
const buttonPermTreeRef = ref(null)
const buttonPermTreeData = ref([])
const filteredButtonPermTreeData = computed(() => {
  const checkedMenuIds = menuTreeRef.value?.getCheckedKeys() || []
  if (checkedMenuIds.length === 0) return []

  return buttonPermTreeData.value.filter(menuNode => {
    return checkedMenuIds.includes(menuNode.menuId)
  })
})

// 数据权限
const deptTreeRef = ref(null)
const deptTreeData = ref([])
const menuDataScopeList = ref([])
const filteredMenuDataScopeList = computed(() => {
  const checkedMenuIds = menuTreeRef.value?.getCheckedKeys() || []
  if (checkedMenuIds.length === 0) return []

  return menuDataScopeList.value.filter(menu => {
    return checkedMenuIds.includes(menu.menuId)
  })
})
const currentEditingMenuScope = ref(null)
const deptSelectorVisible = ref(false)

// 条件构建器相关
const conditionBuilderVisible = ref(false)
const currentConditions = ref(null)
const conditionFields = ref([])
const currentConditionMenuId = ref(null)

// 获取角色列表
async function fetchRoles() {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value
    }
    if (searchKeyword.value) params.keyword = searchKeyword.value
    if (statusFilter.value !== '' && statusFilter.value !== null) params.status = statusFilter.value

    const res = await getRoleList(params)
    roleList.value = res.data.list || []
    total.value = res.data.total || 0
  } catch (error) {
    console.error('获取角色列表失败:', error)
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  currentPage.value = 1
  fetchRoles()
}

function resetSearch() {
  searchKeyword.value = ''
  statusFilter.value = ''
  currentPage.value = 1
  fetchRoles()
}

function handlePageChange(page) {
  currentPage.value = page
  fetchRoles()
}

function handleSizeChange(size) {
  pageSize.value = size
  currentPage.value = 1
  fetchRoles()
}

// 新增/编辑
function showAddDialog() {
  editingRole.value = null
  form.value = createDefaultForm()
  dialogVisible.value = true
}

function editRole(row) {
  editingRole.value = row
  form.value = {
    roleKey: row.roleKey,
    roleName: row.roleName,
    description: row.description || '',
    sort: row.sort || 0,
    status: row.status
  }
  dialogVisible.value = true
}

function resetForm() {
  formRef.value?.resetFields()
}

async function saveRole() {
  try {
    await formRef.value.validate()

    if (editingRole.value) {
      const { roleKey, ...updateData } = form.value
      await updateRole(editingRole.value.id, updateData)
      ElMessage.success('角色更新成功')
    } else {
      await createRole(form.value)
      ElMessage.success('角色添加成功')
    }
    dialogVisible.value = false
    await fetchRoles()
  } catch (error) {
    console.error(error)
  }
}

// 状态切换
async function handleStatusChange(row, val) {
  try {
    await updateRoleStatus(row.id, { status: val })
    ElMessage.success(val ? '已启用' : '已禁用')
  } catch (error) {
    // 失败时回滚
    row.status = val ? 0 : 1
  }
}

// 删除
async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除角色「${row.roleName}」吗？删除后不可恢复。`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    await deleteRole(row.id)
    ElMessage.success('删除成功')
    await fetchRoles()
  } catch (error) {
    if (error !== 'cancel') {
      console.error(error)
    }
  }
}

// 菜单权限
function buildTree(menus) {
  const map = {}
  const tree = []
  const sorted = [...menus].sort((a, b) => (a.sort || 0) - (b.sort || 0))

  sorted.forEach(menu => {
    map[menu.id] = { id: menu.id, label: menu.meta?.title || menu.name, children: [] }
  })

  sorted.forEach(menu => {
    const node = map[menu.id]
    if (menu.parentId === null || menu.parentId === undefined || menu.parentId === 0 || menu.parentId === '') {
      tree.push(node)
    } else if (map[menu.parentId]) {
      map[menu.parentId].children.push(node)
    }
  })

  // 移除空 children
  const trimEmpty = (nodes) => {
    nodes.forEach(node => {
      if (node.children.length) {
        trimEmpty(node.children)
      } else {
        delete node.children
      }
    })
  }
  trimEmpty(tree)

  return tree
}

async function showMenuPermDialog(row) {
  currentPermRole.value = row
  menuPermDialogVisible.value = true
  menuPermLoading.value = true
  try {
    // 获取全量菜单和已勾选的菜单 ID
    const [menusRes, roleMenusRes] = await Promise.all([
      getMenus(),
      getRoleMenus(row.id)
    ])
    const menus = menusRes.data?.rows || menusRes.data?.list || menusRes.data || []
    // 只显示应用平台的菜单
    const appMenus = Array.isArray(menus) ? menus.filter(m => m.platform === 'app-platform') : []
    menuTreeData.value = buildTree(appMenus)

    const checkedIds = roleMenusRes.data?.menuIds || []
    // 等 DOM 更新后设置选中
    setTimeout(() => {
      menuTreeRef.value?.setCheckedKeys(checkedIds)
    }, 0)
  } catch (error) {
    console.error('获取菜单权限失败:', error)
  } finally {
    menuPermLoading.value = false
  }
}

async function saveMenuPerm() {
  try {
    const menuIds = menuTreeRef.value.getCheckedKeys()
    await setRoleMenus(currentPermRole.value.id, { menuIds })
    ElMessage.success('菜单权限保存成功')
    menuPermDialogVisible.value = false
  } catch (error) {
    console.error(error)
  }
}

// 权限配置
async function showPermConfigDialog(row) {
  currentConfigRole.value = row
  permConfigDialogVisible.value = true
  permConfigLoading.value = true
  activePermTab.value = 'menu'

  try {
    // 并行加载所有数据
    const [menusRes, roleMenusRes, permsRes, rolePermsRes, deptRes, dataScopeRes] = await Promise.all([
      getMenus(),
      getRoleMenus(row.id),
      getPermissions(),
      getRolePermissions(row.id),
      getDepartments(),
      getRoleDataScope(row.id)
    ])

    // 构建菜单树（只显示应用平台的菜单）
    const menus = menusRes.data?.rows || menusRes.data?.list || menusRes.data || []
    const appMenus = Array.isArray(menus) ? menus.filter(m => m.meta?.platform === 'app-platform') : []
    menuTreeData.value = buildTree(appMenus)

    // 回显已选菜单权限
    const checkedMenuIds = roleMenusRes.data?.menuIds || []
    setTimeout(() => {
      menuTreeRef.value?.setCheckedKeys(checkedMenuIds)
    }, 0)

    // 构建菜单数据权限列表（只包含应用平台的叶子菜单）
    const leafMenus = appMenus.filter(menu => {
      // 判断是否为叶子节点（没有子菜单）
      return !appMenus.some(m => m.parentId === menu.id)
    })

    // 构建按钮权限树（按菜单分组）
    const permissions = permsRes.data?.list || permsRes.data || []
    buttonPermTreeData.value = buildPermissionTree(permissions, appMenus)

    // 回显已选按钮权限
    const checkedPermIds = rolePermsRes.data?.permissionIds || []
    setTimeout(() => {
      buttonPermTreeRef.value?.setCheckedKeys(checkedPermIds)
    }, 0)

    // 构建部门树
    const departments = deptRes.data?.list || deptRes.data || []
    deptTreeData.value = buildDeptTree(departments)

    const dataScopeData = dataScopeRes.data || {}
    const menuScopes = dataScopeData.menuScopes || {}

    menuDataScopeList.value = leafMenus.map(menu => ({
      menuId: menu.id,
      menuName: menu.meta?.title || menu.name,
      scope: menuScopes[menu.id]?.scope || 'all',
      departmentIds: menuScopes[menu.id]?.departmentIds || [],
      customConditions: menuScopes[menu.id]?.customConditions || null
    }))
  } catch (error) {
    console.error('获取权限配置失败:', error)
  } finally {
    permConfigLoading.value = false
  }
}

// 构建按钮权限树（按菜单分组）
function buildPermissionTree(permissions, menus = []) {
  const menuMap = {}
  const menuIdMap = {}

  // 创建菜单 ID 到菜单名称的映射
  menus.forEach(menu => {
    menuIdMap[menu.id] = menu.meta?.title || menu.name
  })

  permissions.forEach(perm => {
    const menuName = perm.menuName || menuIdMap[perm.menu_id] || '未分组'
    const menuId = perm.menu_id || null

    if (!menuMap[menuName]) {
      menuMap[menuName] = {
        id: `menu_${menuName}`,
        label: menuName,
        menuId: menuId,
        children: []
      }
    }
    menuMap[menuName].children.push({
      id: perm.id,
      label: `${perm.name} (${perm.code})`
    })
  })

  return Object.values(menuMap)
}

// 构建部门树
function buildDeptTree(departments) {
  const map = {}
  const tree = []

  departments.forEach(dept => {
    map[dept.id] = { id: dept.id, name: dept.name, children: [] }
  })

  departments.forEach(dept => {
    const node = map[dept.id]
    if (!dept.parentId || dept.parentId === 0) {
      tree.push(node)
    } else if (map[dept.parentId]) {
      map[dept.parentId].children.push(node)
    }
  })

  // 移除空 children
  const trimEmpty = (nodes) => {
    nodes.forEach(node => {
      if (node.children.length) {
        trimEmpty(node.children)
      } else {
        delete node.children
      }
    })
  }
  trimEmpty(tree)

  return tree
}

// 保存权限配置
async function savePermConfig() {
  try {
    // 保存菜单权限
    const menuIds = menuTreeRef.value.getCheckedKeys()
    await setRoleMenus(currentConfigRole.value.id, { menuIds })

    // 保存按钮权限
    const permissionIds = buttonPermTreeRef.value.getCheckedKeys().filter(id => typeof id === 'number')
    await updateRolePermissions(currentConfigRole.value.id, permissionIds)

    // 保存数据权限（按菜单）
    const menuScopes = {}
    menuDataScopeList.value.forEach(item => {
      menuScopes[item.menuId] = {
        scope: item.scope,
        departmentIds: item.departmentIds,
        customConditions: item.customConditions
      }
    })
    await updateRoleDataScope(currentConfigRole.value.id, { menuScopes })

    ElMessage.success('权限配置保存成功')
    permConfigDialogVisible.value = false
  } catch (error) {
    console.error(error)
  }
}

// 全选菜单
function checkAllMenus() {
  const allIds = []
  const collectIds = (nodes) => {
    nodes.forEach(node => {
      allIds.push(node.id)
      if (node.children && node.children.length) {
        collectIds(node.children)
      }
    })
  }
  collectIds(menuTreeData.value)
  menuTreeRef.value?.setCheckedKeys(allIds)
}

// 取消全选菜单
function uncheckAllMenus() {
  menuTreeRef.value?.setCheckedKeys([])
}

// 显示部门选择器
function showDeptSelector(row) {
  currentEditingMenuScope.value = row
  deptSelectorVisible.value = true
  setTimeout(() => {
    deptTreeRef.value?.setCheckedKeys(row.departmentIds || [])
  }, 0)
}

// 保存部门选择
function saveDeptSelection() {
  if (currentEditingMenuScope.value) {
    currentEditingMenuScope.value.departmentIds = deptTreeRef.value?.getCheckedKeys() || []
  }
  deptSelectorVisible.value = false
}

// 显示条件构建器
function showConditionBuilder(row) {
  currentConditionMenuId.value = row.menuId
  currentConditions.value = row.customConditions || {
    type: 'group',
    operator: 'AND',
    conditions: []
  }

  // 设置可用字段（示例字段，实际应该从后端获取）
  conditionFields.value = [
    { key: 'status', label: '状态', type: 'enum', options: [
      { label: '启用', value: 1 },
      { label: '禁用', value: 0 }
    ]},
    { key: 'createTime', label: '创建时间', type: 'date' },
    { key: 'amount', label: '金额', type: 'number' },
    { key: 'name', label: '名称', type: 'string' }
  ]

  conditionBuilderVisible.value = true
}

// 保存条件
function saveConditions() {
  const menuScope = menuDataScopeList.value.find(item => item.menuId === currentConditionMenuId.value)
  if (menuScope) {
    menuScope.customConditions = currentConditions.value
  }
  conditionBuilderVisible.value = false
}

onMounted(() => {
  fetchRoles()
})
</script>

<style lang="scss" scoped>
.role-manage-container {
  .pagination-wrapper {
    display: flex;
    justify-content: flex-end;
    padding: 16px 0 0;
  }

  .perm-tree-container {
    max-height: 400px;
    overflow-y: auto;
    padding: 8px 0;
  }

  .data-scope-container {
    padding: 8px 0;

    :deep(.el-table) {
      .el-table__cell {
        padding: 12px 0;
      }
    }
  }
}
</style>
