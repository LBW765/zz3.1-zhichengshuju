<template>
  <div class="menu-manage-container page-shell">
    <PageHeader
      title="菜单管理"
      description="基于真实菜单接口治理顶部 Tab、左侧菜单与页面布局模式"
      class="page-shell__section"
    >
      <template #extra>
        <el-button :icon="Refresh" @click="fetchMenus">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="showAddDialog">新增菜单</el-button>
      </template>
    </PageHeader>

    <el-card shadow="never" class="toolbar-card page-card page-shell__section page-toolbar">
      <div class="toolbar-row page-toolbar__row">
        <el-input
          v-model="searchQuery"
          placeholder="搜索菜单名称 / 路由名称 / 路由路径"
          :prefix-icon="Search"
          clearable
          class="search-input page-toolbar__search"
        />
        <div v-if="isAdminPlatform" class="page-toolbar__actions">
          <el-tabs v-model="platformFilter" class="platform-tabs">
            <el-tab-pane label="应用平台" name="app-platform" />
            <el-tab-pane label="管理平台" name="admin-platform" />
          </el-tabs>
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="page-card page-shell__section table-page-card">
      <div class="table-shell menu-table-shell">
        <el-table
          :data="filteredMenuTree"
          row-key="id"
          stripe
          default-expand-all
          class="menu-table"
          :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
          :fit="false"
          :indent="24"
        >
          <el-table-column prop="meta.title" label="菜单名称" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">
              <span>{{ row.meta?.title || row.name }}</span>
            </template>
          </el-table-column>
          <el-table-column label="图标" width="70" align="center">
            <template #default="{ row }">
              <el-icon v-if="row.meta?.icon" class="menu-icon"><component :is="row.meta.icon" /></el-icon>
              <span v-else class="menu-icon-empty">-</span>
            </template>
          </el-table-column>
          <el-table-column label="类型" width="120" align="center">
            <template #default="{ row }">
              <div class="type-tags">
                <el-tag v-if="row.children?.length" size="small">目录</el-tag>
                <el-tag v-else type="success" size="small">菜单</el-tag>
                <el-tag v-if="row.sourceMenuId" type="warning" size="small">副本</el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="路由名称" min-width="160" show-overflow-tooltip />
          <el-table-column prop="path" label="路由路径" min-width="200" show-overflow-tooltip />
          <el-table-column prop="component" label="组件路径" min-width="260" show-overflow-tooltip />
          <el-table-column label="平台归属" width="120" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.meta?.platform === PLATFORMS.ADMIN" type="danger" size="small">管理平台</el-tag>
              <el-tag v-else-if="row.meta?.platform === PLATFORMS.APP" type="success" size="small">应用平台</el-tag>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="布局模式" width="120" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.meta?.layout === 'page'" type="success" size="small">页面模式</el-tag>
              <el-tag v-else type="primary" size="small">侧边栏</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="sort" label="排序" width="80" align="center" />
          <el-table-column label="状态" width="140" align="center">
            <template #default="{ row }">
              <div class="flag-tags">
                <el-tag v-if="row.meta?.affix" type="warning" size="small">固定</el-tag>
                <el-tag v-if="row.meta?.hidden" type="info" size="small">隐藏</el-tag>
                <span v-if="!row.meta?.affix && !row.meta?.hidden">-</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="280" fixed="right" align="left">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button link type="primary" @click="editMenu(row)">编辑</el-button>
                <el-button v-if="!row.children?.length" link type="warning" @click="showPermissionDrawer(row)">按钮</el-button>
                <el-button link type="success" @click="showPublishDialog(row)">发布</el-button>
                <el-button link type="danger" @click="handleDelete(row.id)">删除</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="editingMenu ? '编辑菜单' : '新增菜单'"
      width="760px"
      :close-on-click-modal="false"
      class="menu-edit-dialog"
    >
      <div class="menu-edit-dialog__body">
        <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
          <div class="menu-form-section">
            <div class="menu-form-section__title">基础信息</div>

            <el-form-item label="上级菜单" prop="parentId">
              <el-tree-select
                v-model="form.parentId"
                :data="menuTreeOptions"
                placeholder="不选则为顶级菜单（显示为顶部 Tab）"
                clearable
                check-strictly
                :render-after-expand="false"
                style="width: 100%"
              />
            </el-form-item>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="菜单名称" prop="meta.title">
                  <el-input v-model="form.meta.title" placeholder="请输入菜单名称" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="图标" prop="meta.icon">
                  <IconPicker v-model="form.meta.icon" placeholder="请选择图标" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="8">
                <el-form-item label="排序" prop="sort">
                  <el-input-number v-model="form.sort" :min="0" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="固定标签" prop="meta.affix">
                  <el-switch v-model="form.meta.affix" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="隐藏菜单" prop="meta.hidden">
                  <el-switch v-model="form.meta.hidden" />
                </el-form-item>
              </el-col>
            </el-row>
          </div>

          <div class="menu-form-section">
            <div class="menu-form-section__title">投放信息</div>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="平台归属" prop="meta.platform">
                  <el-select
                    v-if="!isEditing && !form.parentId"
                    v-model="form.meta.platform"
                    style="width: 100%"
                  >
                    <el-option label="应用平台" :value="PLATFORMS.APP" />
                    <el-option label="管理平台" :value="PLATFORMS.ADMIN" />
                  </el-select>
                  <el-input
                    v-else
                    :model-value="resolvedFormPlatformLabel"
                    disabled
                    placeholder="子菜单平台由上级菜单决定"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="布局模式" prop="meta.layout">
                  <el-select
                    v-if="!isEditing && !form.parentId"
                    v-model="form.meta.layout"
                    style="width: 100%"
                  >
                    <el-option label="侧边栏模式" value="sidebar" />
                    <el-option label="页面模式" value="page" />
                  </el-select>
                  <el-input
                    v-else
                    :model-value="resolvedFormLayoutLabel"
                    disabled
                    placeholder="子菜单自动继承目录布局"
                  />
                </el-form-item>
              </el-col>
            </el-row>
          </div>

          <div class="menu-form-section">
            <div class="menu-form-section__title">技术定义</div>
            <div v-if="isEditing" class="menu-form-tip">
              这些字段在编辑已有菜单时已锁定。如需在其他位置使用当前页面，请使用“发布到其他位置”。
            </div>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="路由名称" prop="name">
                  <el-input v-model="form.name" :disabled="isEditing" placeholder="例如：AdminMenu" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="重定向" prop="redirect">
                  <el-input
                    v-model="form.redirect"
                    :disabled="isEditing"
                    placeholder="可选，例如：/admin/system/platform"
                  />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="路由路径" prop="path">
                  <el-input
                    v-model="form.path"
                    :disabled="isEditing"
                    placeholder="顶级示例：/admin/system；子级示例：menu"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="组件路径" prop="component">
                  <el-input
                    v-model="form.component"
                    :disabled="isEditing"
                    placeholder="例如：system/menu/index 或 Layout"
                  />
                </el-form-item>
              </el-col>
            </el-row>
          </div>
        </el-form>
      </div>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveMenu">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="publishDialogVisible"
      title="发布到其他位置"
      width="760px"
      :close-on-click-modal="false"
      class="menu-edit-dialog"
    >
      <div class="menu-edit-dialog__body">
        <el-form ref="publishFormRef" :model="publishForm" :rules="publishRules" label-width="100px">
          <div class="menu-form-section">
            <div class="menu-form-section__title">来源页面</div>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="来源菜单">
                  <el-input :model-value="publishSourceMenu?.meta?.title || publishSourceMenu?.name || ''" disabled />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="组件路径">
                  <el-input :model-value="publishSourceMenu?.component || ''" disabled />
                </el-form-item>
              </el-col>
            </el-row>
          </div>

          <div class="menu-form-section">
            <div class="menu-form-section__title">发布信息</div>

            <el-form-item label="上级菜单" prop="parentId">
              <el-tree-select
                v-model="publishForm.parentId"
                :data="publishMenuTreeOptions"
                placeholder="不选则作为新的顶级菜单发布"
                clearable
                check-strictly
                :render-after-expand="false"
                style="width: 100%"
              />
            </el-form-item>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="菜单名称" prop="meta.title">
                  <el-input v-model="publishForm.meta.title" placeholder="请输入发布后的菜单名称" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="图标" prop="meta.icon">
                  <IconPicker v-model="publishForm.meta.icon" placeholder="请选择图标" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="平台归属" prop="meta.platform">
                  <el-select v-if="!publishForm.parentId" v-model="publishForm.meta.platform" style="width: 100%">
                    <el-option label="应用平台" :value="PLATFORMS.APP" />
                    <el-option label="管理平台" :value="PLATFORMS.ADMIN" />
                  </el-select>
                  <el-input v-else :model-value="publishPlatformLabel" disabled />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="布局模式" prop="meta.layout">
                  <el-select v-if="!publishForm.parentId" v-model="publishForm.meta.layout" style="width: 100%">
                    <el-option label="侧边栏模式" value="sidebar" />
                    <el-option label="页面模式" value="page" />
                  </el-select>
                  <el-input v-else model-value="继承上级菜单" disabled />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="8">
                <el-form-item label="排序" prop="sort">
                  <el-input-number v-model="publishForm.sort" :min="0" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="固定标签" prop="meta.affix">
                  <el-switch v-model="publishForm.meta.affix" />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="隐藏菜单" prop="meta.hidden">
                  <el-switch v-model="publishForm.meta.hidden" />
                </el-form-item>
              </el-col>
            </el-row>
          </div>

          <div class="menu-form-section">
            <div class="menu-form-section__title">系统自动处理</div>
            <div class="menu-form-tip">
              路由名称、路由路径和重定向会自动生成并复用来源页面定义，你只需要决定显示名称、图标和投放位置。
            </div>
          </div>
        </el-form>
      </div>

      <template #footer>
        <el-button @click="publishDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handlePublish">发布</el-button>
      </template>
    </el-dialog>

    <el-drawer
      v-model="permissionDrawerVisible"
      :title="`按钮权限管理 - ${currentMenu?.meta?.title || currentMenu?.name || ''}`"
      size="760px"
      :close-on-click-modal="false"
    >
      <div class="permission-drawer-body">
        <el-card shadow="never" class="toolbar-card">
          <el-button type="primary" :icon="Plus" @click="showAddPermissionDialog">新增按钮</el-button>
        </el-card>

        <el-card shadow="never" class="permission-table-card">
          <div class="table-shell">
            <el-table :data="permissions" stripe :fit="false">
              <el-table-column prop="permission" label="权限标识" min-width="240" show-overflow-tooltip />
              <el-table-column prop="name" label="按钮名称" width="120" show-overflow-tooltip />
              <el-table-column prop="sort" label="排序" width="80" align="center" />
              <el-table-column label="操作" width="140" fixed="right" align="left">
                <template #default="{ row }">
                  <div class="table-actions">
                    <el-button link type="primary" @click="editPermission(row)">编辑</el-button>
                    <el-button link type="danger" @click="handleDeletePermission(row.id)">删除</el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-card>
      </div>
    </el-drawer>

    <el-dialog
      v-model="permissionDialogVisible"
      :title="editingPermission ? '编辑按钮权限' : '新增按钮权限'"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form ref="permissionFormRef" :model="permissionForm" :rules="permissionRules" label-width="100px">
        <el-form-item label="权限标识" prop="code">
          <el-input
            v-model="permissionForm.code"
            :disabled="!!editingPermission"
            placeholder="例如：system:user:add"
          />
        </el-form-item>
        <el-form-item label="权限名称" prop="name">
          <el-input v-model="permissionForm.name" placeholder="例如：新增用户" />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="permissionForm.type" style="width: 100%">
            <el-option label="按钮" value="button" />
            <el-option label="接口" value="api" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="permissionForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入权限描述"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="permissionDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="savePermission">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus } from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader/index.vue'
import IconPicker from '@/components/IconPicker/index.vue'
import { getMenus, createMenu, updateMenu, deleteMenu, publishMenu, getMenuButtons } from '@/api/menu'
import { getPermissions, addPermission, updatePermission, deletePermission } from '@/api/permission'
import { usePermissionStore } from '@/store/permission'
import { useAppStore } from '@/store/app'
import { PLATFORMS } from '@/constants/auth'

const router = useRouter()
const permissionStore = usePermissionStore()
const appStore = useAppStore()

const isAdminPlatform = computed(() => {
  return router.currentRoute.value.path.startsWith('/admin-system')
})

const menus = ref([])
const dialogVisible = ref(false)
const editingMenu = ref(null)
const formRef = ref()
const searchQuery = ref('')
const platformFilter = ref(PLATFORMS.APP)
const publishDialogVisible = ref(false)
const publishFormRef = ref()
const publishSourceMenu = ref(null)

const permissionDrawerVisible = ref(false)
const permissionDialogVisible = ref(false)
const permissionFormRef = ref()
const currentMenu = ref(null)
const permissions = ref([])
const editingPermission = ref(null)

const createDefaultForm = () => ({
  parentId: null,
  name: '',
  path: '',
  component: 'Layout',
  redirect: '',
  meta: {
    title: '',
    icon: '',
    layout: 'sidebar',
    platform: PLATFORMS.APP,
    affix: false,
    hidden: false,
    roles: ['administrator', 'admin', 'user']
  },
  sort: 1
})

const createPublishDefaultForm = () => ({
  parentId: null,
  meta: {
    title: '',
    icon: '',
    layout: 'sidebar',
    platform: PLATFORMS.APP,
    affix: false,
    hidden: false
  },
  sort: 1
})

const form = ref(createDefaultForm())
const publishForm = ref(createPublishDefaultForm())

const createPermissionDefaultForm = () => ({
  code: '',
  name: '',
  type: 'button',
  description: '',
  menuId: null
})

const permissionForm = ref(createPermissionDefaultForm())

const validatePlatform = (_, value, callback) => {
  if (!isEditing.value && !form.value.parentId && !value) {
    callback(new Error('请选择平台归属'))
    return
  }
  callback()
}

const validateLayout = (_, value, callback) => {
  if (!isEditing.value && !form.value.parentId && !value) {
    callback(new Error('请选择布局模式'))
    return
  }
  callback()
}

const validatePublishPlatform = (_, value, callback) => {
  if (!publishForm.value.parentId && !value) {
    callback(new Error('请选择平台归属'))
    return
  }
  callback()
}

const validatePublishLayout = (_, value, callback) => {
  if (!publishForm.value.parentId && !value) {
    callback(new Error('请选择布局模式'))
    return
  }
  callback()
}

const rules = {
  name: [{ required: true, message: '请输入路由名称', trigger: 'blur' }],
  path: [{ required: true, message: '请输入路由路径', trigger: 'blur' }],
  component: [{ required: true, message: '请输入组件路径', trigger: 'blur' }],
  'meta.title': [{ required: true, message: '请输入菜单名称', trigger: 'blur' }],
  'meta.platform': [{ validator: validatePlatform, trigger: 'change' }],
  'meta.layout': [{ validator: validateLayout, trigger: 'change' }]
}

const publishRules = {
  'meta.title': [{ required: true, message: '请输入菜单名称', trigger: 'blur' }],
  'meta.platform': [{ validator: validatePublishPlatform, trigger: 'change' }],
  'meta.layout': [{ validator: validatePublishLayout, trigger: 'change' }]
}

const permissionRules = {
  code: [
    { required: true, message: '请输入权限标识', trigger: 'blur' },
    { pattern: /^[a-z]+:[a-z]+:[a-z]+$/, message: '格式：模块:资源:操作（如 system:user:add）', trigger: 'blur' }
  ],
  name: [{ required: true, message: '请输入权限名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }]
}

const isEditing = computed(() => Boolean(editingMenu.value?.id))

function findMenuById(id, items = menus.value) {
  for (const item of items) {
    if (item.id === id) return item
    if (item.children?.length) {
      const found = findMenuById(id, item.children)
      if (found) return found
    }
  }
  return null
}

const selectedParentMenu = computed(() => {
  if (!form.value.parentId) return null
  return findMenuById(form.value.parentId)
})

const publishParentMenu = computed(() => {
  if (!publishForm.value.parentId) return null
  return findMenuById(publishForm.value.parentId)
})

const resolvedFormPlatformLabel = computed(() => getPlatformLabel(selectedParentMenu.value?.meta?.platform || form.value.meta.platform))
const resolvedFormLayoutLabel = computed(() => selectedParentMenu.value ? '继承上级菜单' : getLayoutLabel(form.value.meta.layout))
const publishPlatformLabel = computed(() => getPlatformLabel(publishParentMenu.value?.meta?.platform || publishForm.value.meta.platform))

watch(() => form.value.parentId, (newVal, oldVal) => {
  if (newVal == null && oldVal != null) {
    if (form.value.path && !form.value.path.startsWith('/')) {
      form.value.path = `/${form.value.path}`
    }
    form.value.meta.layout ||= 'sidebar'
    form.value.meta.platform ||= PLATFORMS.APP
  }

  if (newVal != null) {
    if (form.value.path.startsWith('/')) {
      form.value.path = form.value.path.slice(1)
    }
    const parent = findMenuById(newVal)
    if (parent?.meta?.platform) {
      form.value.meta.platform = parent.meta.platform
    }
    form.value.meta.layout = ''
  }
})

watch(() => publishForm.value.parentId, (newVal) => {
  if (newVal == null) {
    publishForm.value.meta.layout ||= 'sidebar'
    publishForm.value.meta.platform ||= PLATFORMS.APP
    return
  }
  const parent = findMenuById(newVal)
  if (parent?.meta?.platform) {
    publishForm.value.meta.platform = parent.meta.platform
  }
  publishForm.value.meta.layout = ''
})

function buildTree(items, parentId = null) {
  return items
    .filter(item => item.parentId === parentId)
    .sort((a, b) => (a.sort || 0) - (b.sort || 0))
    .map(item => {
      const children = buildTree(items, item.id)
      return children.length ? { ...item, children } : { ...item }
    })
}

const menuTree = computed(() => buildTree(menus.value))

const filteredMenuTree = computed(() => {
  let tree = menuTree.value.filter(item => item.meta?.platform === platformFilter.value)

  if (!searchQuery.value) return tree

  const keyword = searchQuery.value.toLowerCase()
  const filterTree = (items) => {
    return items.reduce((result, item) => {
      const cloned = { ...item }
      const matched = [cloned.meta?.title, cloned.name, cloned.path]
        .filter(Boolean)
        .some(value => value.toLowerCase().includes(keyword))

      if (cloned.children?.length) {
        cloned.children = filterTree(cloned.children)
      }

      if (matched || cloned.children?.length) {
        result.push(cloned)
      }

      return result
    }, [])
  }

  return filterTree(tree)
})

function collectDescendantIds(menu) {
  const ids = new Set([menu.id])
  const walk = (children = []) => {
    children.forEach(child => {
      ids.add(child.id)
      if (child.children?.length) walk(child.children)
    })
  }
  if (menu.children?.length) walk(menu.children)
  return ids
}

const menuTreeOptions = computed(() => {
  const blockedIds = editingMenu.value ? collectDescendantIds(editingMenu.value) : new Set()
  const convert = (items) => items
    .filter(item => !blockedIds.has(item.id))
    .map(item => ({
      value: item.id,
      label: item.meta?.title || item.name,
      children: item.children ? convert(item.children) : undefined
    }))
  return convert(menuTree.value)
})

const publishMenuTreeOptions = computed(() => {
  const convert = (items) => items.map(item => ({
    value: item.id,
    label: item.meta?.title || item.name,
    children: item.children ? convert(item.children) : undefined
  }))
  return convert(menuTree.value)
})

function getPlatformLabel(platform) {
  if (platform === PLATFORMS.ADMIN) return '管理平台'
  if (platform === PLATFORMS.APP) return '应用平台'
  return '-'
}

function getLayoutLabel(layout) {
  if (layout === 'page') return '页面模式'
  return '侧边栏模式'
}

async function fetchMenus() {
  try {
    const res = await getMenus()
    menus.value = Array.isArray(res.data) ? res.data : []
  } catch (error) {
    ElMessage.error(error?.message || '获取菜单列表失败')
  }
}

function showAddDialog() {
  editingMenu.value = null
  form.value = createDefaultForm()
  dialogVisible.value = true
}

function editMenu(menu) {
  editingMenu.value = menu
  const { children, ...menuData } = JSON.parse(JSON.stringify(menu))
  form.value = {
    ...createDefaultForm(),
    ...menuData,
    meta: {
      ...createDefaultForm().meta,
      ...(menuData.meta || {})
    }
  }
  dialogVisible.value = true
}

function showPublishDialog(menu) {
  publishSourceMenu.value = menu
  publishForm.value = {
    ...createPublishDefaultForm(),
    meta: {
      ...createPublishDefaultForm().meta,
      title: menu.meta?.title || menu.name,
      icon: menu.meta?.icon || '',
      platform: menu.meta?.platform || PLATFORMS.APP,
      layout: menu.meta?.layout || 'sidebar',
      affix: !!menu.meta?.affix,
      hidden: !!menu.meta?.hidden
    },
    sort: menu.sort || 1
  }
  publishDialogVisible.value = true
}

async function reloadRoutes() {
  permissionStore.resetRoutes()
  appStore.setActiveTab('')
  await router.push('/')
}

function normalizeCreatePayload(data) {
  const submitData = JSON.parse(JSON.stringify(data))
  submitData.parentId = submitData.parentId || null

  if (submitData.parentId) {
    const parent = findMenuById(submitData.parentId)
    if (submitData.path.startsWith('/')) {
      submitData.path = submitData.path.slice(1)
    }
    submitData.meta.layout = ''
    submitData.meta.platform = parent?.meta?.platform || submitData.meta.platform
  } else if (submitData.path && !submitData.path.startsWith('/')) {
    submitData.path = `/${submitData.path}`
  }

  return submitData
}

function buildUpdatePayload() {
  const submitData = {
    parentId: form.value.parentId || null,
    meta: {
      title: form.value.meta.title,
      icon: form.value.meta.icon,
      affix: form.value.meta.affix,
      hidden: form.value.meta.hidden
    },
    sort: form.value.sort
  }
  return submitData
}

async function saveMenu() {
  try {
    await formRef.value.validate()

    // 新增顶级菜单时，检查数量限制
    if (!isEditing.value && !form.value.parentId && form.value.meta.platform === PLATFORMS.APP) {
      const topMenuCount = menus.value.filter(m => !m.parentId && m.meta?.platform === PLATFORMS.APP).length
      if (topMenuCount >= 5) {
        ElMessage.error('app-platform 顶级菜单已达上限（5个），请在现有菜单下新增二级菜单')
        return
      }
    }

    if (isEditing.value) {
      await updateMenu(editingMenu.value.id, buildUpdatePayload())
      ElMessage.success('菜单更新成功')
    } else {
      await createMenu(normalizeCreatePayload(form.value))
      ElMessage.success('菜单添加成功')
    }

    dialogVisible.value = false
    await fetchMenus()
    await reloadRoutes()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || '保存失败')
    }
  }
}

function buildPublishPayload() {
  const submitData = JSON.parse(JSON.stringify(publishForm.value))
  submitData.parentId = submitData.parentId || null
  if (submitData.parentId) {
    const parent = findMenuById(submitData.parentId)
    submitData.meta.platform = parent?.meta?.platform || submitData.meta.platform
    submitData.meta.layout = ''
  }
  return submitData
}

async function handlePublish() {
  try {
    await publishFormRef.value.validate()
    await publishMenu(publishSourceMenu.value.id, buildPublishPayload())
    publishDialogVisible.value = false
    ElMessage.success('发布成功')
    await fetchMenus()
    await reloadRoutes()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || '发布失败')
    }
  }
}

async function handleDelete(id) {
  try {
    await ElMessageBox.confirm('确定删除该菜单吗？若存在子菜单，后端会阻止删除。', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await deleteMenu(id)
    ElMessage.success('删除成功')
    await fetchMenus()
    await reloadRoutes()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || '删除失败')
    }
  }
}

async function showPermissionDrawer(menu) {
  currentMenu.value = menu
  permissionDrawerVisible.value = true
  await fetchPermissions(menu.id)
}

async function fetchPermissions(menuId) {
  try {
    const res = await getMenuButtons(menuId)
    permissions.value = Array.isArray(res.data) ? res.data : []
  } catch (error) {
    ElMessage.error(error?.message || '获取按钮权限列表失败')
  }
}

function showAddPermissionDialog() {
  editingPermission.value = null
  permissionForm.value = {
    ...createPermissionDefaultForm(),
    menuId: currentMenu.value.id
  }
  permissionDialogVisible.value = true
}

function editPermission(permission) {
  editingPermission.value = permission
  permissionForm.value = {
    ...createPermissionDefaultForm(),
    ...JSON.parse(JSON.stringify(permission))
  }
  permissionDialogVisible.value = true
}

async function savePermission() {
  try {
    await permissionFormRef.value.validate()

    if (editingPermission.value) {
      await updatePermission(editingPermission.value.id, permissionForm.value)
      ElMessage.success('权限更新成功')
    } else {
      await addPermission(permissionForm.value)
      ElMessage.success('权限添加成功')
    }

    permissionDialogVisible.value = false
    await fetchPermissions(currentMenu.value.id)
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || '保存失败')
    }
  }
}

async function handleDeletePermission(id) {
  try {
    await ElMessageBox.confirm('确定删除该按钮权限吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await deletePermission(id)
    ElMessage.success('删除成功')
    await fetchPermissions(currentMenu.value.id)
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || '删除失败')
    }
  }
}

onMounted(() => {
  // 应用平台的菜单管理只显示应用平台的菜单
  if (!isAdminPlatform.value) {
    platformFilter.value = PLATFORMS.APP
  }

  fetchMenus()
})
</script>

<style lang="scss" scoped>
.menu-manage-container {
  min-width: 0;

  .toolbar-card {
    margin-bottom: 0;
  }

  .platform-tabs {
    min-width: 0;

    :deep(.el-tabs__header) {
      margin-bottom: 0;
    }
  }

  .table-page-card {
    overflow: hidden;
  }

  .menu-table-shell {
    max-width: 100%;
    overflow: hidden;
  }

  .menu-table {
    :deep(.el-table__inner-wrapper::before) {
      display: none;
    }

    :deep(th.el-table__cell),
    :deep(td.el-table__cell) {
      border-right: none;
    }

    :deep(.el-table__cell) {
      padding: 16px 0;
    }

    :deep(.el-table__fixed-right::before),
    :deep(.el-table__fixed::before) {
      display: none;
    }
  }

  .menu-icon {
    font-size: 18px;
    color: var(--text-secondary);
  }

  .menu-icon-empty {
    color: var(--text-light);
  }

  .type-tags,
  .flag-tags {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-width: 0;
    flex-wrap: nowrap;
  }

  .menu-edit-dialog {
    :deep(.el-dialog__body) {
      padding: 0;
    }
  }

  .menu-edit-dialog__body {
    flex: 1;
    min-height: 0;
    padding: 16px 24px 8px;
    overflow-y: auto;
  }

  .menu-form-section {
    padding-bottom: 8px;
  }

  .menu-form-section + .menu-form-section {
    margin-top: 12px;
    padding-top: 20px;
    border-top: 1px solid var(--border-light);
  }

  .menu-form-section__title {
    margin-bottom: 16px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .menu-form-tip {
    margin-bottom: 16px;
    padding: 10px 12px;
    border: 1px solid var(--border-light);
    border-radius: 10px;
    background: var(--bg-hover);
    color: var(--text-secondary);
    font-size: 13px;
    line-height: 1.6;
  }

  .permission-drawer-body {
    display: flex;
    flex-direction: column;
    gap: 16px;
    height: 100%;

    .toolbar-card {
      flex-shrink: 0;
    }

    .permission-table-card {
      flex: 1;
      min-height: 0;
      overflow: hidden;

      .table-shell {
        height: 100%;
        overflow: auto;
      }
    }
  }
}
</style>
