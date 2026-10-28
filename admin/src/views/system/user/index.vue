<template>
  <div class="page-shell">
    <PageHeader title="用户管理" description="管理系统内部用户、角色和账号状态" class="page-shell__section">
      <template #extra>
        <el-button :icon="Refresh" @click="fetchUsers">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="showAddDialog">新增用户</el-button>
      </template>
    </PageHeader>

    <el-card shadow="never" class="page-card page-shell__section page-toolbar">
      <div class="page-toolbar__row">
        <div class="page-toolbar__filters">
          <el-input v-model="searchKeyword" placeholder="搜索用户名 / 昵称 / 邮箱 / 手机号" clearable :prefix-icon="Search" style="width: 300px" @keyup.enter="handleSearch" />
          <el-select v-model="statusFilter" placeholder="状态" clearable style="width: 120px">
            <el-option label="启用" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
          <el-select v-model="roleFilter" placeholder="角色" clearable style="width: 150px">
            <el-option v-for="role in roleOptions" :key="role.roleKey" :label="role.roleName" :value="role.roleKey" />
          </el-select>
        </div>
        <div class="page-toolbar__actions">
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button :icon="Refresh" @click="resetSearch">重置</el-button>
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="page-card page-shell__section table-page-card">
      <div class="table-shell">
        <el-table :data="userList" v-loading="loading" stripe :fit="false">
          <el-table-column prop="username" label="用户名" min-width="140" show-overflow-tooltip />
          <el-table-column prop="nickName" label="昵称" min-width="140" show-overflow-tooltip />
          <el-table-column prop="deptName" label="部门" min-width="120" show-overflow-tooltip />
          <el-table-column label="角色" min-width="180">
            <template #default="{ row }">
              <el-tag v-for="role in row.roles" :key="role" :type="roleTagType(role)" size="small" class="role-tag">
                {{ roleLabel(role) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="email" label="邮箱" min-width="180" show-overflow-tooltip />
          <el-table-column prop="phone" label="手机号" width="140" />
          <el-table-column label="状态" width="90" align="center">
            <template #default="{ row }">
              <el-switch v-model="row.status" :active-value="1" :inactive-value="0" :disabled="row.id === currentUserId" @change="(val) => handleStatusChange(row, val)" />
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" min-width="180" />
          <el-table-column label="操作" width="210" fixed="right" align="left">
            <template #default="{ row }">
              <div class="table-actions">
                <template v-if="row.username === 'administrator' || row.id === currentUserId">
                  <el-button type="primary" link disabled>编辑</el-button>
                  <el-button type="warning" link disabled>重置密码</el-button>
                </template>
                <template v-else>
                  <el-button type="primary" link @click="editUser(row)">编辑</el-button>
                  <el-button type="warning" link @click="showResetPwdDialog(row)">重置密码</el-button>
                  <el-button type="danger" link :disabled="isAdminUser(row)" @click="handleDelete(row)">删除</el-button>
                </template>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div class="pagination-wrapper">
        <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize" :page-sizes="[10, 20, 30, 50]" :total="total" layout="total, sizes, prev, pager, next, jumper" @size-change="handleSizeChange" @current-change="handlePageChange" />
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editingUser ? '编辑用户' : '新增用户'" width="760px" :close-on-click-modal="false" @closed="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="用户名" prop="username">
              <el-input v-model="form.username" placeholder="请输入用户名" :disabled="!!editingUser" />
            </el-form-item>
          </el-col>
          <el-col v-if="!editingUser" :span="12">
            <el-form-item label="密码" prop="password">
              <el-input v-model="form.password" type="password" placeholder="请输入密码" show-password />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="昵称" prop="nickName">
              <el-input v-model="form.nickName" placeholder="请输入昵称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="部门" prop="deptId">
              <el-select v-model="form.deptId" filterable clearable placeholder="请选择部门" style="width: 100%" @change="handleDepartmentChange">
                <el-option v-for="dept in departmentOptions" :key="dept.id" :label="dept.name" :value="dept.id" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="邮箱" prop="email">
              <el-input v-model="form.email" placeholder="请输入邮箱" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="手机号" prop="phone">
              <el-input v-model="form.phone" placeholder="请输入手机号" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="状态">
              <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="角色" prop="roles">
          <el-select v-model="form.roles" multiple placeholder="请选择角色" style="width: 100%" @change="syncRoleNameFromRoles">
            <el-option v-for="role in roleOptions" :key="role.roleKey" :label="role.roleName" :value="role.roleKey" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveUser">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="resetPwdDialogVisible" title="重置密码" width="500px" :close-on-click-modal="false" @closed="resetPwdForm = createResetPwdForm()">
      <el-form ref="resetPwdFormRef" :model="resetPwdForm" :rules="resetPwdRules" label-width="100px">
        <el-form-item label="新密码" prop="password">
          <el-input v-model="resetPwdForm.password" type="password" placeholder="请输入新密码" show-password />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input v-model="resetPwdForm.confirmPassword" type="password" placeholder="请再次输入新密码" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetPwdDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleResetPassword">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Search } from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader/index.vue'
import { createUser, deleteUser, getUserList, resetUserPassword, updateUser, updateUserStatus } from '@/api/user'
import { getAllRoles } from '@/api/role'
import { getDepartments } from '@/api/department'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const currentUserId = computed(() => userStore.userInfo.userId)

const userList = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const loading = ref(false)

const searchKeyword = ref('')
const statusFilter = ref('')
const roleFilter = ref('')
const roleOptions = ref([])
const departmentOptions = ref([])

const dialogVisible = ref(false)
const editingUser = ref(null)
const formRef = ref(null)

function createDefaultForm() {
  return {
    username: '',
    password: '',
    nickName: '',
    email: '',
    phone: '',
    deptId: null,
    deptName: '',
    roleName: '',
    status: 1,
    roles: []
  }
}

const form = ref(createDefaultForm())

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6个字符', trigger: 'blur' }
  ],
  nickName: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  deptId: [{ required: true, message: '请选择部门', trigger: 'change' }],
  roles: [{ required: true, message: '请选择角色', trigger: 'change', type: 'array' }]
}

const resetPwdDialogVisible = ref(false)
const resetPwdUserId = ref(null)
const resetPwdFormRef = ref(null)

function createResetPwdForm() {
  return { password: '', confirmPassword: '' }
}

const resetPwdForm = ref(createResetPwdForm())

const resetPwdRules = {
  password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码至少6个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (value !== resetPwdForm.value.password) callback(new Error('两次密码输入不一致'))
        else callback()
      },
      trigger: 'blur'
    }
  ]
}

function roleTagType(role) {
  const map = { administrator: 'danger', admin: 'warning', user: 'success' }
  return map[role] || 'info'
}

function roleLabel(role) {
  return roleOptions.value.find(item => item.roleKey === role)?.roleName || role
}

function isAdminUser(row) {
  return row.roles?.includes('administrator')
}

async function fetchRoles() {
  const res = await getAllRoles()
  roleOptions.value = res.data || []
}

function flattenDepartments(nodes, result = []) {
  ;(nodes || []).forEach(node => {
    result.push({ id: node.id, name: node.deptName })
    if (Array.isArray(node.children) && node.children.length) flattenDepartments(node.children, result)
  })
  return result
}

async function fetchDepartments() {
  const res = await getDepartments()
  departmentOptions.value = flattenDepartments(res.data || [])
}

async function fetchUsers() {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value
    }
    if (searchKeyword.value) params.keyword = searchKeyword.value
    if (statusFilter.value !== '' && statusFilter.value !== null) params.status = statusFilter.value
    if (roleFilter.value) params.role = roleFilter.value

    const res = await getUserList(params)
    userList.value = res.data?.list || []
    total.value = res.data?.total || 0
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  currentPage.value = 1
  fetchUsers()
}

function resetSearch() {
  searchKeyword.value = ''
  statusFilter.value = ''
  roleFilter.value = ''
  currentPage.value = 1
  fetchUsers()
}

function handlePageChange(page) {
  currentPage.value = page
  fetchUsers()
}

function handleSizeChange(size) {
  pageSize.value = size
  currentPage.value = 1
  fetchUsers()
}

function showAddDialog() {
  editingUser.value = null
  form.value = createDefaultForm()
  dialogVisible.value = true
}

function editUser(row) {
  editingUser.value = row
  form.value = {
    username: row.username,
    password: '',
    nickName: row.nickName || '',
    email: row.email || '',
    phone: row.phone || '',
    deptId: row.deptId || null,
    deptName: row.deptName || '',
    roleName: row.roleName || '',
    status: row.status,
    roles: [...(row.roles || [])]
  }
  dialogVisible.value = true
}

function resetForm() {
  formRef.value?.resetFields()
  form.value = createDefaultForm()
}

function handleDepartmentChange(value) {
  const department = departmentOptions.value.find(item => item.id === value)
  form.value.deptName = department?.name || ''
}

function syncRoleNameFromRoles(roles) {
  form.value.roleName = (roles || [])
    .map(roleKey => roleOptions.value.find(item => item.roleKey === roleKey)?.roleName)
    .filter(Boolean)
    .join('、')
}

async function saveUser() {
  await formRef.value.validate()
  syncRoleNameFromRoles(form.value.roles)

  if (editingUser.value) {
    const { username, password, ...payload } = form.value
    await updateUser(editingUser.value.id, payload)
    ElMessage.success('用户更新成功')
  } else {
    await createUser(form.value)
    ElMessage.success('用户添加成功')
  }
  dialogVisible.value = false
  await fetchUsers()
}

async function handleStatusChange(row, val) {
  try {
    await updateUserStatus(row.id, { status: val })
    ElMessage.success(val ? '已启用' : '已禁用')
  } catch (error) {
    row.status = val ? 0 : 1
  }
}

function showResetPwdDialog(row) {
  resetPwdUserId.value = row.id
  resetPwdForm.value = createResetPwdForm()
  resetPwdDialogVisible.value = true
}

async function handleResetPassword() {
  await resetPwdFormRef.value.validate()
  await resetUserPassword(resetPwdUserId.value, { password: resetPwdForm.value.password })
  ElMessage.success('密码重置成功')
  resetPwdDialogVisible.value = false
}

async function handleDelete(row) {
  await ElMessageBox.confirm(`确定删除用户“${row.username}”吗？删除后不可恢复。`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
  await deleteUser(row.id)
  ElMessage.success('删除成功')
  await fetchUsers()
}

onMounted(() => {
  fetchUsers()
  fetchRoles()
  fetchDepartments()
})
</script>

<style lang="scss" scoped>
.role-tag {
  margin-right: 4px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  padding: 16px 0 0;
}
</style>
