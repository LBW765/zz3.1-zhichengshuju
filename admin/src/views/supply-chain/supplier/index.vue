<template>
  <div class="page-shell">
    <PageHeader title="供应商档案" description="管理供应商分类与供应商基础信息" class="page-shell__section">
      <template #extra>
        <el-button :icon="Refresh" @click="refreshAll">刷新</el-button>
      </template>
    </PageHeader>

    <el-card shadow="never" class="page-card page-shell__section page-toolbar">
      <div class="search-bar">
        <div class="search-bar__fields">
          <div class="search-bar__item">
            <span class="search-bar__label">编码/名称</span>
            <el-input v-model="search.keyword" placeholder="请输入编码或名称" clearable style="width: 200px" @keyup.enter="handleSearch" />
          </div>
          <div class="search-bar__item">
            <span class="search-bar__label">合作状态</span>
            <el-select v-model="search.cooperationStatus" placeholder="全部" clearable style="width: 130px">
              <el-option label="合作中" value="合作中" />
              <el-option label="暂停" value="暂停" />
              <el-option label="终止" value="终止" />
            </el-select>
          </div>
          <div class="search-bar__item">
            <span class="search-bar__label">供应商等级</span>
            <el-select v-model="search.supplierLevel" placeholder="全部" clearable style="width: 130px">
              <el-option label="战略" value="战略" />
              <el-option label="优选" value="优选" />
              <el-option label="合格" value="合格" />
              <el-option label="待评" value="待评" />
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
              <span class="panel-header__title">供应商分类</span>
              <span class="panel-header__actions">
                <el-button type="primary" text :icon="Upload" size="small" @click="categoryImportVisible = true">导入</el-button>
                <el-button type="primary" text :icon="Plus" size="small" @click="showCategoryDialog()">新增</el-button>
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
              <span>全部供应商</span>
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

      <!-- 右侧：供应商列表 -->
      <div class="split-panel__right">
        <el-card shadow="never" class="panel-card">
          <template #header>
            <div class="panel-header">
              <span class="panel-header__title">{{ selectedCategoryId ? '分类筛选中' : '全部供应商' }}</span>
              <span class="panel-header__actions">
                <el-button type="primary" text :icon="Upload" size="small" @click="dataImportVisible = true">导入</el-button>
                <el-button type="primary" text :icon="Download" size="small" @click="handleExport">导出{{ selectedRows.length ? `(${selectedRows.length})` : '' }}</el-button>
                <el-button type="primary" text :icon="Plus" size="small" @click="showSupplierDialog()">新增</el-button>
              </span>
            </div>
          </template>
          <div class="table-shell" v-loading="tableLoading">
            <el-table :data="tableData" :fit="false" size="small" @selection-change="handleSelectionChange">
              <el-table-column type="selection" width="45" />
              <el-table-column prop="supplierCode" label="编码" width="110" show-overflow-tooltip />
              <el-table-column prop="supplierName" label="供应商名称" min-width="180" show-overflow-tooltip />
              <el-table-column prop="contactName" label="联系人" width="80" />
              <el-table-column prop="contactPhone" label="联系电话" width="130" show-overflow-tooltip />
              <el-table-column prop="supplierLevel" label="等级" width="70" align="center">
                <template #default="{ row }">
                  <el-tag :type="levelTagType(row.supplierLevel)" size="small">{{ row.supplierLevel || '-' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="cooperationStatus" label="合作状态" width="90" align="center">
                <template #default="{ row }">
                  <el-tag :type="coopTagType(row.cooperationStatus)" size="small">{{ row.cooperationStatus || '-' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="状态" width="70" align="center">
                <template #default="{ row }">
                  <el-tag :type="row.status ? 'success' : 'info'" size="small">{{ row.status ? '启用' : '停用' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="140" align="left" fixed="right">
                <template #default="{ row }">
                  <div class="table-actions">
                    <el-button type="primary" link size="small" @click="showSupplierDialog(row)">编辑</el-button>
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

    <!-- 分类新增/编辑弹窗 -->
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

    <!-- 供应商新增/编辑弹窗 -->
    <el-dialog v-model="supplierDialogVisible" :title="editingSupplier ? '编辑供应商' : '新增供应商'" width="760px" :close-on-click-modal="false" @closed="handleSupplierDialogClosed">
      <el-form ref="supplierFormRef" :model="supplierForm" :rules="supplierRules" label-width="100px">
        <el-divider content-position="left">基本信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="供应商编码" prop="supplierCode">
              <el-input v-model="supplierForm.supplierCode" placeholder="不填则自动生成" :disabled="!!editingSupplier" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="供应商名称" prop="supplierName">
              <el-input v-model="supplierForm.supplierName" placeholder="请输入供应商名称" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="所属分类">
              <el-tree-select
                v-model="supplierForm.categoryId"
                :data="categoryTree"
                :props="{ label: 'name', value: 'id', children: 'children' }"
                placeholder="请选择分类"
                clearable
                check-strictly
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-switch v-model="supplierForm.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="停用" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">联系信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="联系人">
              <el-input v-model="supplierForm.contactName" placeholder="联系人姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话">
              <el-input v-model="supplierForm.contactPhone" placeholder="联系电话" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="邮箱">
              <el-input v-model="supplierForm.email" placeholder="邮箱地址" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="省市区">
              <div style="display: flex; gap: 6px;">
                <el-input v-model="supplierForm.province" placeholder="省" style="flex: 1" />
                <el-input v-model="supplierForm.city" placeholder="市" style="flex: 1" />
                <el-input v-model="supplierForm.district" placeholder="区" style="flex: 1" />
              </div>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="详细地址">
          <el-input v-model="supplierForm.address" placeholder="详细地址" />
        </el-form-item>

        <el-divider content-position="left">财务信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="开户银行">
              <el-input v-model="supplierForm.bankName" placeholder="开户银行" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="银行账号">
              <el-input v-model="supplierForm.bankAccount" placeholder="银行账号" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="纳税编码">
              <el-input v-model="supplierForm.taxNo" placeholder="统一社会信用代码" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="默认税率(%)">
              <el-input-number v-model="supplierForm.taxRate" :min="0" :max="100" :precision="1" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">资质信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="法人代表">
              <el-input v-model="supplierForm.legalPerson" placeholder="法人代表" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="营业执照号">
              <el-input v-model="supplierForm.businessLicense" placeholder="营业执照号" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">业务信息</el-divider>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="供应商等级">
              <el-select v-model="supplierForm.supplierLevel" style="width: 100%">
                <el-option label="战略" value="战略" />
                <el-option label="优选" value="优选" />
                <el-option label="合格" value="合格" />
                <el-option label="待评" value="待评" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="合作状态">
              <el-select v-model="supplierForm.cooperationStatus" style="width: 100%">
                <el-option label="合作中" value="合作中" />
                <el-option label="暂停" value="暂停" />
                <el-option label="终止" value="终止" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注">
          <el-input v-model="supplierForm.remark" type="textarea" :rows="2" maxlength="500" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="supplierDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveSupplier">保存</el-button>
      </template>
    </el-dialog>

    <!-- 供应商分类导入 -->
    <ImportDialog
      v-model="categoryImportVisible"
      title="导入供应商分类"
      :columns="categoryImportColumns"
      template-file-name="供应商分类导入模板"
      :import-fn="importSupplierCategory"
      @success="handleCategoryImportSuccess"
    />

    <!-- 供应商档案导入 -->
    <ImportDialog
      v-model="dataImportVisible"
      title="导入供应商档案"
      :columns="dataImportColumns"
      template-file-name="供应商档案导入模板"
      :import-fn="importSupplier"
      @success="handleDataImportSuccess"
    />
  </div>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus, EditPen, Delete, Folder, Upload, Download } from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader/index.vue'
import ImportDialog from '@/components/ImportDialog/index.vue'
import { exportExcel } from '@/utils/excel'
import { getNextCode } from '@/api/codeRule'
import {
  getSupplierList, getSupplierDetail, createSupplier, updateSupplier, updateSupplierStatus, deleteSupplier,
  getSupplierCategoryList, createSupplierCategory, updateSupplierCategory, deleteSupplierCategory,
  importSupplierCategory, importSupplier
} from '@/api/supplyChain'

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
      id: item.id,
      name: item.categoryName,
      code: item.categoryCode,
      sort: item.sort,
      remark: item.remark,
      parentId: item.parentId,
      children: buildTree(list, item.id)
    }))
}

async function fetchCategories() {
  try {
    const res = await getSupplierCategoryList()
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
    getNextCode('supplier_category').then(res => {
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
      await updateSupplierCategory(editingCat.value.id, catForm.value)
      ElMessage.success('更新成功')
    } else {
      await createSupplierCategory(catForm.value)
      ElMessage.success('添加成功')
    }
    catDialogVisible.value = false
    await fetchCategories()
  } catch (e) { if (e?.message) console.error(e) }
}

async function handleDeleteCategory(data) {
  try {
    await ElMessageBox.confirm(`确定删除分类「${data.name}」吗？`, '提示', { type: 'warning' })
    await deleteSupplierCategory(data.id)
    ElMessage.success('删除成功')
    if (selectedCategoryId.value === data.id) {
      selectedCategoryId.value = null
    }
    await fetchCategories()
    fetchList()
  } catch (e) { if (e !== 'cancel') console.error(e) }
}

// ========== 供应商列表 ==========

const tableData = ref([])
const tableLoading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const search = ref({ keyword: '', cooperationStatus: '', supplierLevel: '' })

async function fetchList() {
  tableLoading.value = true
  try {
    const params = { page: page.value, pageSize: pageSize.value }
    if (search.value.keyword) params.keyword = search.value.keyword
    if (search.value.cooperationStatus) params.cooperationStatus = search.value.cooperationStatus
    if (search.value.supplierLevel) params.supplierLevel = search.value.supplierLevel
    if (selectedCategoryId.value) params.categoryId = selectedCategoryId.value

    const res = await getSupplierList(params)
    tableData.value = res.data.list || []
    total.value = res.data.total || 0
  } catch (e) { console.error(e) }
  finally { tableLoading.value = false }
}

function handleSearch() { page.value = 1; fetchList() }
function resetSearch() {
  search.value = { keyword: '', cooperationStatus: '', supplierLevel: '' }
  page.value = 1
  fetchList()
}

function refreshAll() {
  selectedCategoryId.value = null
  treeRef.value?.setCurrentKey(null)
  resetSearch()
  fetchCategories()
}

// ========== 供应商弹窗 ==========

const supplierDialogVisible = ref(false)
const editingSupplier = ref(null)
const supplierFormRef = ref(null)

function defaultForm() {
  return {
    supplierCode: '', supplierName: '', categoryId: selectedCategoryId.value || null,
    contactName: '', contactPhone: '', email: '',
    province: '', city: '', district: '', address: '',
    bankName: '', bankAccount: '', taxNo: '', taxRate: null,
    legalPerson: '', businessLicense: '',
    supplierLevel: '待评', cooperationStatus: '合作中',
    status: 1, remark: ''
  }
}

const supplierForm = ref(defaultForm())
const supplierRules = {
  supplierName: [{ required: true, message: '请输入供应商名称', trigger: 'blur' }]
}

async function showSupplierDialog(row) {
  editingSupplier.value = row || null
  if (row) {
    try {
      const res = await getSupplierDetail(row.id)
      const d = res.data || {}
      supplierForm.value = {
        supplierCode: d.supplierCode || '', supplierName: d.supplierName || '', categoryId: d.categoryId,
        contactName: d.contactName || '', contactPhone: d.contactPhone || '', email: d.email || '',
        province: d.province || '', city: d.city || '', district: d.district || '', address: d.address || '',
        bankName: d.bankName || '', bankAccount: d.bankAccount || '', taxNo: d.taxNo || '', taxRate: d.taxRate,
        legalPerson: d.legalPerson || '', businessLicense: d.businessLicense || '',
        supplierLevel: d.supplierLevel || '待评', cooperationStatus: d.cooperationStatus || '合作中',
        status: d.status ?? 1, remark: d.remark || ''
      }
    } catch (e) { console.error(e); supplierForm.value = defaultForm() }
  } else {
    supplierForm.value = defaultForm()
    getNextCode('supplier').then(res => {
      if (res.data?.preview) supplierForm.value.supplierCode = res.data.preview
    }).catch(() => {})
  }
  supplierDialogVisible.value = true
}

function handleSupplierDialogClosed() {
  supplierFormRef.value?.resetFields()
  editingSupplier.value = null
}

async function saveSupplier() {
  try {
    await supplierFormRef.value.validate()
    if (editingSupplier.value) {
      await updateSupplier(editingSupplier.value.id, supplierForm.value)
      ElMessage.success('更新成功')
    } else {
      await createSupplier(supplierForm.value)
      ElMessage.success('添加成功')
    }
    supplierDialogVisible.value = false
    fetchList()
  } catch (e) { if (e?.message) console.error(e) }
}

async function handleToggleStatus(row) {
  try {
    await updateSupplierStatus(row.id, { status: row.status ? 0 : 1 })
    ElMessage.success('状态更新成功')
    fetchList()
  } catch (e) { console.error(e) }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除供应商「${row.supplierName}」吗？`, '提示', { type: 'warning' })
    await deleteSupplier(row.id)
    ElMessage.success('删除成功')
    fetchList()
  } catch (e) { if (e !== 'cancel') console.error(e) }
}

function levelTagType(level) {
  const map = { '战略': 'danger', '优选': '', '合格': 'success', '待评': 'info' }
  return map[level] || 'info'
}

function coopTagType(status) {
  const map = { '合作中': 'success', '暂停': 'warning', '终止': 'danger' }
  return map[status] || 'info'
}

// ========== 导入导出 ==========

const categoryImportVisible = ref(false)
const dataImportVisible = ref(false)
const selectedRows = ref([])

function handleSelectionChange(rows) {
  selectedRows.value = rows
}

const categoryImportColumns = [
  { key: 'categoryCode', label: '分类编码', required: true, example: 'GYS-C001', width: 16 },
  { key: 'categoryName', label: '分类名称', required: true, example: '分类A', width: 16 },
  { key: 'parentCode', label: '上级分类编码', example: '', width: 18, note: '留空则为顶级分类' },
  { key: 'sort', label: '排序', example: '0', width: 10 },
  { key: 'remark', label: '备注', example: '', width: 20 }
]

const dataImportColumns = [
  { key: 'supplierCode', label: '供应商编码', required: true, example: 'GYS-001', width: 16 },
  { key: 'supplierName', label: '供应商名称', required: true, example: '某某供应商', width: 18 },
  { key: 'categoryName', label: '供应商分类名', example: '分类A', width: 14, note: '填写分类名称' },
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
  { key: 'taxRate', label: '默认税率(%)', example: '13', width: 12 },
  { key: 'legalPerson', label: '法人代表', example: '李四', width: 10 },
  { key: 'businessLicense', label: '营业执照号', example: '', width: 20 },
  { key: 'supplierLevel', label: '供应商等级', example: '合格', width: 12, note: '战略/优选/合格/待评' },
  { key: 'remark', label: '备注', example: '', width: 20 }
]

const dataExportColumns = [
  { key: 'supplierCode', label: '供应商编码', width: 16 },
  { key: 'supplierName', label: '供应商名称', width: 18 },
  { key: 'categoryName', label: '供应商分类', width: 14 },
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
  { key: 'taxRate', label: '默认税率(%)', width: 12 },
  { key: 'legalPerson', label: '法人代表', width: 10 },
  { key: 'businessLicense', label: '营业执照号', width: 20 },
  { key: 'supplierLevel', label: '供应商等级', width: 12 },
  { key: 'cooperationStatus', label: '合作状态', width: 12 },
  { key: 'status', label: '状态', width: 10, formatter: (v) => v === 1 ? '启用' : '停用' },
  { key: 'remark', label: '备注', width: 20 }
]

function handleCategoryImportSuccess() {
  fetchCategories()
}

function handleDataImportSuccess() {
  fetchList()
}

function handleExport() {
  const data = selectedRows.value.length ? selectedRows.value : tableData.value
  if (!data.length) {
    ElMessage.warning('暂无数据可导出')
    return
  }
  const fileName = selectedRows.value.length
    ? `供应商档案_已选${selectedRows.value.length}条`
    : '供应商档案_全部'
  exportExcel(data, dataExportColumns, fileName)
  ElMessage.success(`已导出 ${data.length} 条数据`)
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
}

.panel-header__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.panel-header__actions {
  display: flex;
  align-items: center;
  gap: 4px;
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
