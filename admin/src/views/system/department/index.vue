<template>
  <div class="page-shell">
    <PageHeader title="部门管理" description="管理组织架构和部门信息" class="page-shell__section">
      <template #extra>
        <el-button :icon="Refresh" @click="fetchList">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="handleAdd">新增部门</el-button>
      </template>
    </PageHeader>

    <div class="page-shell__section">
      <el-card class="page-card">

        <div class="table-shell">
          <el-table
            :data="tableData"
            :fit="false"
            row-key="id"
            :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
            default-expand-all
          >
            <el-table-column prop="deptName" label="部门名称" min-width="200" />
            <el-table-column prop="sortOrder" label="排序" width="100" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
                  {{ row.status === 1 ? '启用' : '禁用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="创建时间" width="180" />
            <el-table-column label="操作" width="220" fixed="right">
              <template #default="{ row }">
                <div class="table-actions">
                  <el-button type="primary" link @click="handleAddChild(row)">新增下级</el-button>
                  <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
                  <el-button type="danger" link @click="handleDelete(row)" :disabled="row.id === 1">删除</el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-card>
    </div>

    <el-dialog
      :title="dialogTitle"
      v-model="dialogVisible"
      width="500px"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="部门名称" prop="deptName">
          <el-input v-model="formData.deptName" placeholder="请输入部门名称" />
        </el-form-item>
        <el-form-item label="上级部门" prop="parentId">
          <el-tree-select
            v-model="formData.parentId"
            :data="departmentTree"
            :props="{ label: 'deptName', value: 'id' }"
            check-strictly
            :render-after-expand="false"
            placeholder="请选择上级部门"
            clearable
          />
        </el-form-item>
        <el-form-item label="排序" prop="sortOrder">
          <el-input-number v-model="formData.sortOrder" :min="0" :max="9999" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="formData.status">
            <el-radio :value="1">启用</el-radio>
            <el-radio :value="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader/index.vue'
import { getDepartments, addDepartment, updateDepartment, deleteDepartment } from '@/api/department'

const tableData = ref([])
const dialogVisible = ref(false)
const formRef = ref(null)
const editingItem = ref(null)
const dialogMode = ref('create')

const formData = ref({
  deptName: '',
  parentId: null,
  sortOrder: 0,
  status: 1
})

const rules = {
  deptName: [
    { required: true, message: '请输入部门名称', trigger: 'blur' }
  ]
}

const dialogTitle = computed(() => {
  if (editingItem.value) return '编辑部门'
  if (dialogMode.value === 'create-child') return '新增下级部门'
  return '新增部门'
})

const departmentTree = computed(() => {
  if (!editingItem.value) return tableData.value

  // 编辑时过滤掉自己和子部门
  const filterTree = (list, excludeId) => {
    return list.filter(item => {
      if (item.id === excludeId) return false
      if (item.children) {
        item.children = filterTree(item.children, excludeId)
      }
      return true
    })
  }

  return filterTree(JSON.parse(JSON.stringify(tableData.value)), editingItem.value.id)
})

const fetchList = async () => {
  try {
    const res = await getDepartments()
    tableData.value = res.data
  } catch (error) {
    ElMessage.error('获取部门列表失败')
  }
}

const handleAdd = () => {
  editingItem.value = null
  dialogMode.value = 'create'
  formData.value = {
    deptName: '',
    parentId: null,
    sortOrder: 0,
    status: 1
  }
  dialogVisible.value = true
}

const handleAddChild = (row) => {
  editingItem.value = null
  dialogMode.value = 'create-child'
  formData.value = {
    deptName: '',
    parentId: row.id,
    sortOrder: 0,
    status: 1
  }
  dialogVisible.value = true
}

const handleEdit = (row) => {
  editingItem.value = row
  dialogMode.value = 'edit'
  formData.value = {
    deptName: row.deptName,
    parentId: row.parentId,
    sortOrder: row.sortOrder,
    status: row.status
  }
  dialogVisible.value = true
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()

    if (editingItem.value) {
      await updateDepartment(editingItem.value.id, formData.value)
      ElMessage.success('更新成功')
    } else {
      await addDepartment(formData.value)
      ElMessage.success('新增成功')
    }

    dialogVisible.value = false
    fetchList()
  } catch (error) {
    if (error !== false) {
      ElMessage.error(error.message || '操作失败')
    }
  }
}

const hasChildren = (row) => {
  return row.children && row.children.length > 0
}

const handleDelete = async (row) => {
  if (hasChildren(row)) {
    ElMessage.warning('该部门下有子部门，无法删除')
    return
  }

  try {
    await ElMessageBox.confirm('确定要删除该部门吗？', '提示', {
      type: 'warning'
    })

    await deleteDepartment(row.id)
    ElMessage.success('删除成功')
    fetchList()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

onMounted(() => {
  fetchList()
})
</script>

