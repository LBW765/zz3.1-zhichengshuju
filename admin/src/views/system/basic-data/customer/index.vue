<template>
  <div class="page-shell">
    <PageHeader title="客户管理" description="管理客户分类与客户基础档案" class="page-shell__section">
      <template #extra>
        <el-button :icon="Refresh" @click="refreshAll">刷新</el-button>
      </template>
    </PageHeader>

    <el-card shadow="never" class="page-card page-shell__section page-toolbar">
      <div class="search-bar">
        <div class="search-bar__fields">
          <div class="search-bar__item">
            <span class="search-bar__label">编号/名称</span>
            <el-input v-model="search.keyword" placeholder="请输入编号或名称" clearable style="width: 200px" @keyup.enter="handleSearch" />
          </div>
          <div class="search-bar__item">
            <span class="search-bar__label">客户等级</span>
            <el-select v-model="search.customerLevel" placeholder="全部" clearable style="width: 120px">
              <el-option label="VIP" value="VIP" />
              <el-option label="普通" value="普通" />
              <el-option label="潜在" value="潜在" />
            </el-select>
          </div>
        </div>
        <div class="search-bar__actions">
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button :icon="Refresh" @click="resetSearch">重置</el-button>
        </div>
      </div>
    </el-card>

    <div class="split-panel page-shell__section">
      <!-- 左侧：分类树 -->
      <div class="split-panel__left" style="width: 280px; min-width: 280px;">
        <el-card shadow="never" class="panel-card">
          <template #header>
            <div class="panel-header">
              <span class="panel-header__title">客户分类</span>
              <span class="panel-header__actions">
                <el-button type="primary" :icon="Plus" size="small" circle title="新增分类" @click="showCategoryDialog()" />
                <el-dropdown trigger="click" @command="handleCategoryCommand">
                  <el-button :icon="MoreFilled" size="small" circle title="更多操作" />
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="import" :icon="Upload">导入分类</el-dropdown-item>
                      <el-dropdown-item command="export" :icon="Download">导出分类</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </span>
            </div>
          </template>
          <div class="tree-wrapper">
            <div
              class="tree-virtual-root"
              :class="{ 'is-active': !selectedCategoryId }"
              @click="handleSelectAllCategory"
            >
              <el-icon><Folder /></el-icon>
              <span>全部客户</span>
            </div>
            <el-tree
              ref="treeRef"
              :data="categoryTree"
              node-key="id"
              highlight-current
              default-expand-all
              :expand-on-click-node="false"
              @node-click="handleCategoryClick"
            >
              <template #default="{ node, data }">
                <div class="tree-node">
                  <span class="tree-node__label">{{ data.name }}</span>
                  <span class="tree-node__actions">
                    <el-button type="primary" link size="small" :icon="Plus" @click.stop="showCategoryDialog(null, data.id)" />
                    <el-button type="primary" link size="small" :icon="EditPen" @click.stop="showCategoryDialog(data)" />
                    <el-button type="danger" link size="small" :icon="Delete" @click.stop="handleDeleteCategory(data)" />
                  </span>
                </div>
              </template>
            </el-tree>
          </div>
        </el-card>
      </div>

      <!-- 右侧：客户列表 -->
      <div class="split-panel__right">
        <el-card shadow="never" class="panel-card">
          <template #header>
            <div class="panel-header">
              <span class="panel-header__title">{{ selectedCategoryId ? '分类筛选中' : '全部客户' }}</span>
              <span class="panel-header__actions">
                <el-button type="primary" text :icon="Upload" size="small" @click="dataImportVisible = true">导入</el-button>
                <el-button type="primary" text :icon="Download" size="small" @click="dataExportVisible = true">导出{{ selectedRows.length ? `(${selectedRows.length})` : '' }}</el-button>
                <el-button type="primary" text :icon="Plus" size="small" @click="showCustomerDialog()">新增</el-button>
              </span>
            </div>
          </template>
          <div class="table-shell" v-loading="tableLoading">
            <el-table :data="tableData" :fit="false" size="small" @selection-change="handleSelectionChange">
              <el-table-column type="selection" width="45" />
              <el-table-column prop="customerNo" label="编号" width="120" show-overflow-tooltip />
              <el-table-column prop="name" label="客户名称" min-width="200" show-overflow-tooltip />
              <el-table-column prop="contactName" label="联系人" width="80" />
              <el-table-column prop="contactPhone" label="电话" width="130" show-overflow-tooltip />
              <el-table-column prop="customerLevel" label="等级" width="70" align="center">
                <template #default="{ row }">
                  <el-tag :type="levelTagType(row.customerLevel)" size="small">{{ row.customerLevel || '-' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="状态" width="70" align="center">
                <template #default="{ row }">
                  <el-tag :type="row.status ? 'success' : 'info'" size="small">{{ row.status ? '启用' : '停用' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="销售归属" min-width="150" align="center">
                <template #default="{ row }">
                  <el-tag v-if="row.salesPoolId" :type="salesPoolTagType(row)" size="small">
                    {{ salesPoolLabel(row) }}
                  </el-tag>
                  <span v-else>-</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="140" align="left" fixed="right">
                <template #default="{ row }">
                  <div class="table-actions">
                    <el-button type="primary" link size="small" @click="showCustomerDialog(row)">编辑</el-button>
                    <el-button :type="row.status ? 'warning' : 'success'" link size="small" @click="handleToggleStatus(row)">{{ row.status ? '停用' : '启用' }}</el-button>
                    <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>
          </div>
          <div class="pagination-wrap">
            <el-pagination
              v-model:current-page="page"
              v-model:page-size="pageSize"
              :page-sizes="[10, 20, 30, 50]"
              layout="total, sizes, prev, pager, next, jumper"
              :total="total"
              @size-change="fetchList"
              @current-change="fetchList"
            />
          </div>
        </el-card>
      </div>
    </div>

    <!-- 分类弹窗 -->
    <el-dialog v-model="catDialogVisible" :title="editingCat ? '编辑分类' : '新增分类'" width="500px" :close-on-click-modal="false" @closed="handleCatDialogClosed">
      <el-form ref="catFormRef" :model="catForm" :rules="catRules" label-width="100px">
        <el-form-item label="分类名称" prop="categoryName">
          <el-input v-model="catForm.categoryName" placeholder="请输入分类名称" />
        </el-form-item>
        <el-form-item label="分类编码" prop="categoryCode">
          <el-input v-model="catForm.categoryCode" placeholder="请输入分类编码" :disabled="!!editingCat" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="catForm.sort" :min="0" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="catForm.remark" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="catDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveCat">保存</el-button>
      </template>
    </el-dialog>

    <!-- 客户新增/编辑弹窗 -->
    <el-dialog v-model="customerDialogVisible" :title="editingCustomer ? '编辑客户' : '新增客户'" width="760px" :close-on-click-modal="false" @closed="handleCustomerDialogClosed">
      <el-form ref="customerFormRef" :model="customerForm" :rules="customerRules" label-width="100px">
        <el-divider content-position="left">基本信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="客户编号" prop="customerNo">
              <el-input v-model="customerForm.customerNo" placeholder="不填则自动生成" :disabled="!!editingCustomer" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="客户名称" prop="name">
              <el-input v-model="customerForm.name" placeholder="请输入客户名称" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="所属分类">
              <el-tree-select v-model="customerForm.categoryId" :data="categoryTree" :props="{ label: 'name', value: 'id', children: 'children' }" placeholder="请选择" clearable check-strictly style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-switch v-model="customerForm.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="停用" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">联系信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="联系人">
              <el-input v-model="customerForm.contactName" placeholder="联系人姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话">
              <el-input v-model="customerForm.contactPhone" placeholder="联系电话" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="邮箱">
              <el-input v-model="customerForm.email" placeholder="邮箱地址" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="省市区">
              <div style="display: flex; gap: 6px;">
                <el-input v-model="customerForm.province" placeholder="省" style="flex: 1" />
                <el-input v-model="customerForm.city" placeholder="市" style="flex: 1" />
                <el-input v-model="customerForm.district" placeholder="区" style="flex: 1" />
              </div>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="详细地址">
          <el-input v-model="customerForm.address" placeholder="详细地址" />
        </el-form-item>

        <el-divider content-position="left">财务信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="开户银行">
              <el-input v-model="customerForm.bankName" placeholder="开户银行" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="银行账号">
              <el-input v-model="customerForm.bankAccount" placeholder="银行账号" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="纳税编码">
              <el-input v-model="customerForm.taxNo" placeholder="统一社会信用代码" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="信用额度(元)">
              <el-input-number v-model="customerForm.creditLimit" :min="0" :precision="2" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">业务信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="客户等级">
              <el-select v-model="customerForm.customerLevel" style="width: 100%">
                <el-option label="VIP" value="VIP" />
                <el-option label="普通" value="普通" />
                <el-option label="潜在" value="潜在" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col v-if="!editingCustomer" :span="12">
            <el-form-item label="客户池">
              <el-checkbox v-model="customerForm.syncToPublicPool">同步到公共客户池</el-checkbox>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注">
          <el-input v-model="customerForm.remark" type="textarea" :rows="2" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="customerDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveCustomer">保存</el-button>
      </template>
    </el-dialog>

    <!-- 客户分类导入 -->
    <ImportDialog
      v-model="categoryImportVisible"
      title="导入客户分类"
      :columns="categoryImportColumns"
      template-file-name="客户分类导入模板"
      :import-fn="importCustomerCategory"
      @success="handleCategoryImportSuccess"
    />

    <!-- 客户档案导入 -->
    <ImportDialog
      v-model="dataImportVisible"
      title="导入客户档案"
      :columns="dataImportColumns"
      template-file-name="客户档案导入模板"
      :import-fn="importCustomer"
      @success="handleDataImportSuccess"
    />

    <ExportDialog
      v-model="categoryExportVisible"
      title="导出客户分类"
      :fields="categoryExportFields"
      :allow-selected="false"
      :current-page-count="categoryList.length"
      :total-count="categoryList.length"
      :export-fn="handleExportCategory"
    />

    <ExportDialog
      v-model="dataExportVisible"
      title="导出客户档案"
      :fields="dataExportFields"
      :selected-count="selectedRows.length"
      :current-page-count="tableData.length"
      :total-count="total"
      :export-fn="handleExport"
    />
  </div>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus, EditPen, Delete, Folder, Upload, Download, MoreFilled } from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader/index.vue'
import ImportDialog from '@/components/ImportDialog/index.vue'
import ExportDialog from '@/components/ExportDialog/index.vue'
import { fetchAllByPage, runDialogExport } from '@/utils/exportDialog'
import { getNextCode } from '@/api/codeRule'
import { getCustomerCategoryList, createCustomerCategory, updateCustomerCategory, deleteCustomerCategory, importCustomerCategory } from '@/api/basicData'
import { getCustomerList, getCustomerDetail, createCustomer, updateCustomer, updateCustomerStatus, deleteCustomer, importCustomer } from '@/api/customer'

// ========== 分类树 ==========

const treeRef = ref(null)
const categoryList = ref([])
const selectedCategoryId = ref(null)

const categoryTree = computed(() => buildTree(categoryList.value))

function buildTree(list, parentId = null) {
  return list
    .filter(item => item.parentId === parentId)
    .sort((a, b) => a.sort - b.sort)
    .map(item => ({
      id: item.id, name: item.categoryName, code: item.categoryCode,
      sort: item.sort, remark: item.remark, parentId: item.parentId,
      children: buildTree(list, item.id)
    }))
}

async function fetchCategories() {
  try {
    const res = await getCustomerCategoryList()
    categoryList.value = res.data.list || []
  } catch (e) { console.error(e) }
}

function handleSelectAllCategory() {
  selectedCategoryId.value = null
  treeRef.value?.setCurrentKey(null)
  page.value = 1
  fetchList()
}

function handleCategoryClick(data) {
  selectedCategoryId.value = data.id
  page.value = 1
  fetchList()
}

// ========== 分类弹窗 ==========

const catDialogVisible = ref(false)
const editingCat = ref(null)
const catFormRef = ref(null)
const catForm = ref({ categoryName: '', categoryCode: '', sort: 0, remark: '', parentId: null })
const catRules = {
  categoryName: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
  categoryCode: [{ required: true, message: '请输入分类编码', trigger: 'blur' }]
}

function showCategoryDialog(data, parentId) {
  editingCat.value = data || null
  if (data) {
    catForm.value = { categoryName: data.name, categoryCode: data.code, sort: data.sort || 0, remark: data.remark || '', parentId: data.parentId }
  } else {
    catForm.value = { categoryName: '', categoryCode: '', sort: 0, remark: '', parentId: parentId || null }
    getNextCode('customer_category').then(res => {
      if (res.data?.preview) catForm.value.categoryCode = res.data.preview
    }).catch(() => {})
  }
  catDialogVisible.value = true
}

function handleCatDialogClosed() {
  catFormRef.value?.resetFields()
  editingCat.value = null
}

async function saveCat() {
  try {
    await catFormRef.value.validate()
    if (editingCat.value) {
      await updateCustomerCategory(editingCat.value.id, catForm.value)
      ElMessage.success('更新成功')
    } else {
      await createCustomerCategory(catForm.value)
      ElMessage.success('添加成功')
    }
    catDialogVisible.value = false
    await fetchCategories()
  } catch (e) { if (e?.message) console.error(e) }
}

async function handleDeleteCategory(data) {
  try {
    await ElMessageBox.confirm(`确定删除分类「${data.name}」吗？`, '提示', { type: 'warning' })
    await deleteCustomerCategory(data.id)
    ElMessage.success('删除成功')
    if (selectedCategoryId.value === data.id) selectedCategoryId.value = null
    await fetchCategories()
    fetchList()
  } catch (e) { if (e !== 'cancel') console.error(e) }
}

// ========== 客户列表 ==========

const tableData = ref([])
const tableLoading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const search = ref({ keyword: '', customerLevel: '' })

async function fetchList() {
  tableLoading.value = true
  try {
    const params = { page: page.value, pageSize: pageSize.value }
    if (search.value.keyword) params.keyword = search.value.keyword
    if (search.value.customerLevel) params.customerLevel = search.value.customerLevel
    if (selectedCategoryId.value) params.categoryId = selectedCategoryId.value

    const res = await getCustomerList(params)
    tableData.value = res.data.list || []
    total.value = res.data.total || 0
  } catch (e) { console.error(e) }
  finally { tableLoading.value = false }
}

function handleSearch() { page.value = 1; fetchList() }
function resetSearch() { search.value = { keyword: '', customerLevel: '' }; page.value = 1; fetchList() }
function refreshAll() {
  selectedCategoryId.value = null
  treeRef.value?.setCurrentKey(null)
  resetSearch()
  fetchCategories()
}

// ========== 客户弹窗 ==========

const customerDialogVisible = ref(false)
const editingCustomer = ref(null)
const customerFormRef = ref(null)

function defaultForm() {
  return {
    customerNo: '', name: '', categoryId: selectedCategoryId.value || null,
    contactName: '', contactPhone: '', email: '',
    province: '', city: '', district: '', address: '',
    bankName: '', bankAccount: '', taxNo: '', creditLimit: null,
    customerLevel: '普通', status: 1, remark: '', syncToPublicPool: true
  }
}

const customerForm = ref(defaultForm())
const customerRules = {
  name: [{ required: true, message: '请输入客户名称', trigger: 'blur' }]
}

async function showCustomerDialog(row) {
  editingCustomer.value = row || null
  if (row) {
    try {
      const res = await getCustomerDetail(row.id)
      const d = res.data || {}
      customerForm.value = {
        customerNo: d.customerNo || '', name: d.name || '', categoryId: d.categoryId,
        contactName: d.contactName || '', contactPhone: d.contactPhone || '', email: d.email || '',
        province: d.province || '', city: d.city || '', district: d.district || '', address: d.address || '',
        bankName: d.bankName || '', bankAccount: d.bankAccount || '', taxNo: d.taxNo || '', creditLimit: d.creditLimit,
        customerLevel: d.customerLevel || '普通', status: d.status ?? 1, remark: d.remark || '', syncToPublicPool: false
      }
    } catch (e) { console.error(e); customerForm.value = defaultForm() }
  } else {
    customerForm.value = defaultForm()
    getNextCode('customer').then(res => {
      if (res.data?.preview) customerForm.value.customerNo = res.data.preview
    }).catch(() => {})
  }
  customerDialogVisible.value = true
}

function handleCustomerDialogClosed() {
  customerFormRef.value?.resetFields()
  editingCustomer.value = null
}

async function saveCustomer() {
  try {
    await customerFormRef.value.validate()
    if (editingCustomer.value) {
      await updateCustomer(editingCustomer.value.id, customerForm.value)
      ElMessage.success('更新成功')
    } else {
      await createCustomer(customerForm.value)
      ElMessage.success('添加成功')
    }
    customerDialogVisible.value = false
    fetchList()
  } catch (e) { if (e?.message) console.error(e) }
}

async function handleToggleStatus(row) {
  try {
    await updateCustomerStatus(row.id, { status: row.status ? 0 : 1 })
    ElMessage.success('状态更新成功')
    fetchList()
  } catch (e) { console.error(e) }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除客户「${row.name}」吗？`, '提示', { type: 'warning' })
    await deleteCustomer(row.id)
    ElMessage.success('删除成功')
    fetchList()
  } catch (e) { if (e !== 'cancel') console.error(e) }
}

function levelTagType(level) {
  const map = { 'VIP': 'danger', '普通': '', '潜在': 'info' }
  return map[level] || 'info'
}

function salesPoolLabel(row) {
  if (!row.salesPoolId) return '-'
  if (row.salesPoolType === 'public') return '公共客户池'
  return row.salesOwnerUserName ? `我的客户：${row.salesOwnerUserName}` : '我的客户'
}

function salesPoolTagType(row) {
  if (row.salesPoolStatus === 'converted') return 'success'
  if (row.salesPoolType === 'public') return 'info'
  return 'primary'
}

// ========== 导入导出 ==========

const categoryImportVisible = ref(false)
const dataImportVisible = ref(false)
const categoryExportVisible = ref(false)
const dataExportVisible = ref(false)
const selectedRows = ref([])

function handleSelectionChange(rows) {
  selectedRows.value = rows
}

const categoryImportColumns = [
  { key: 'categoryCode', label: '分类编码', required: true, example: 'KH-C001', width: 16 },
  { key: 'categoryName', label: '分类名称', required: true, example: '重点客户', width: 16 },
  { key: 'parentCode', label: '上级分类编码', example: '', width: 18, note: '留空则为顶级分类' },
  { key: 'sort', label: '排序', example: '0', width: 10 },
  { key: 'remark', label: '备注', example: '', width: 20 }
]

const categoryExportFields = [
  { key: 'categoryCode', label: '分类编码', width: 16 },
  { key: 'categoryName', label: '分类名称', width: 16 },
  { key: 'parentCode', label: '上级分类编码', width: 18 },
  { key: 'parentName', label: '上级分类名称', width: 18 },
  { key: 'sort', label: '排序', width: 10 },
  { key: 'status', label: '状态', width: 10, formatter: (v) => v === 1 ? '启用' : '停用' },
  { key: 'remark', label: '备注', width: 20, default: false },
  { key: 'createdAt', label: '创建时间', width: 20, default: false }
]

const dataImportColumns = [
  { key: 'customerNo', label: '客户编号', required: true, example: 'KH-001', width: 16 },
  { key: 'name', label: '客户名称', required: true, example: '某某科技有限公司', width: 20 },
  { key: 'categoryName', label: '客户分类名', example: '重点客户', width: 14, note: '填写分类名称' },
  { key: 'contactName', label: '联系人', example: '张三', width: 10 },
  { key: 'contactPhone', label: '联系电话', example: '13800138000', width: 14 },
  { key: 'email', label: '邮箱', example: 'test@example.com', width: 20 },
  { key: 'province', label: '省', example: '广东省', width: 10 },
  { key: 'city', label: '市', example: '深圳市', width: 10 },
  { key: 'district', label: '区', example: '南山区', width: 10 },
  { key: 'address', label: '详细地址', example: '科技园路1号', width: 22 },
  { key: 'bankName', label: '开户银行', example: '中国银行', width: 14 },
  { key: 'bankAccount', label: '银行账号', example: '6222000000000000', width: 20 },
  { key: 'taxNo', label: '纳税编码', example: '91440300...', width: 22 },
  { key: 'creditLimit', label: '信用额度(元)', example: '100000', width: 14 },
  { key: 'customerLevel', label: '客户等级', example: '普通', width: 12, note: 'VIP/普通/潜在' },
  { key: 'syncToPublicPool', label: '同步公共客户池', example: '是', width: 16, note: '留空默认同步；填 否/0/false 则不同步' },
  { key: 'remark', label: '备注', example: '', width: 20 }
]

const dataExportFields = [
  { key: 'customerNo', label: '客户编号', width: 16 },
  { key: 'name', label: '客户名称', width: 20 },
  { key: 'categoryName', label: '客户分类', width: 14 },
  { key: 'contactName', label: '联系人', width: 10 },
  { key: 'contactPhone', label: '联系电话', width: 14 },
  { key: 'email', label: '邮箱', width: 20 },
  { key: 'province', label: '省', width: 10 },
  { key: 'city', label: '市', width: 10 },
  { key: 'district', label: '区', width: 10 },
  { key: 'address', label: '详细地址', width: 22 },
  { key: 'bankName', label: '开户银行', width: 14 },
  { key: 'bankAccount', label: '银行账号', width: 20 },
  { key: 'taxNo', label: '纳税编码', width: 22 },
  { key: 'creditLimit', label: '信用额度(元)', width: 14 },
  { key: 'customerLevel', label: '客户等级', width: 12 },
  { key: 'salesPoolType', label: '销售归属', width: 16, formatter: (_v, row) => salesPoolLabel(row) },
  { key: 'salesPoolStatus', label: '客户池状态', width: 14 },
  { key: 'status', label: '状态', width: 10, formatter: (v) => v === 1 ? '启用' : '停用' },
  { key: 'remark', label: '备注', width: 20 }
]

function handleCategoryCommand(command) {
  if (command === 'import') categoryImportVisible.value = true
  if (command === 'export') categoryExportVisible.value = true
}

function handleCategoryImportSuccess() {
  fetchCategories()
}

function handleDataImportSuccess() {
  fetchList()
}

async function handleExportCategory({ scope, fields }) {
  await runDialogExport({
    scope,
    fields,
    allFields: categoryExportFields,
    currentRows: categoryList.value,
    fetchAll: async () => categoryList.value,
    fileName: '客户分类'
  })
}

async function handleExport({ scope, fields }) {
  const filters = {}
  if (search.value.keyword) filters.keyword = search.value.keyword
  if (search.value.customerLevel) filters.customerLevel = search.value.customerLevel
  if (selectedCategoryId.value) filters.categoryId = selectedCategoryId.value

  await runDialogExport({
    scope,
    fields,
    allFields: dataExportFields,
    selectedRows: selectedRows.value,
    currentRows: tableData.value,
    fetchAll: () => fetchAllByPage(getCustomerList, filters),
    fileName: '客户档案'
  })
}

onMounted(() => {
  fetchCategories()
  fetchList()
})
</script>

<style lang="scss" scoped>
.split-panel {
  display: flex;
  gap: 16px;
  min-height: 500px;
}

.split-panel__left {
  flex-shrink: 0;
}

.split-panel__right {
  flex: 1;
  min-width: 0;
}

.panel-card {
  height: 100%;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.panel-header__title {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.panel-header__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.tree-wrapper {
  max-height: 600px;
  overflow-y: auto;
}

.tree-virtual-root {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  margin-bottom: 4px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-regular);
  transition: background 0.2s;

  &:hover {
    background: var(--bg-hover);
  }

  &.is-active {
    background: rgba(var(--primary-color-rgb), 0.08);
    color: var(--el-color-primary);
    font-weight: 500;
  }
}

.tree-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  font-size: 13px;
}

.tree-node__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-node__actions {
  display: none;
  flex-shrink: 0;
}

.tree-node:hover .tree-node__actions {
  display: flex;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16px 0 4px;
}

.search-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.search-bar__fields {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.search-bar__item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-bar__label {
  font-size: 13px;
  color: var(--text-regular);
  white-space: nowrap;
}

.search-bar__actions {
  display: flex;
  gap: 8px;
}
</style>
