<template>
  <div class="code-rule-container page-shell">
    <PageHeader
      title="编码规则"
      description="统一管理业务编号生成规则，支持段化可视化配置"
      class="page-shell__section"
    >
      <template #extra>
        <el-button :icon="Refresh" @click="fetchList">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="showAddDialog">新增规则</el-button>
      </template>
    </PageHeader>

    <el-card shadow="never" class="toolbar-card page-card page-shell__section page-toolbar">
      <div class="toolbar-row page-toolbar__row">
        <el-input
          v-model="searchQuery.code"
          placeholder="业务键"
          clearable
          class="search-input"
          style="width: 200px"
        />
        <el-input
          v-model="searchQuery.name"
          placeholder="规则名称"
          clearable
          class="search-input"
          style="width: 200px"
        />
        <el-select
          v-model="searchQuery.enabled"
          placeholder="启用状态"
          clearable
          style="width: 140px"
        >
          <el-option label="已启用" :value="1" />
          <el-option label="已停用" :value="0" />
        </el-select>
        <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
      </div>
    </el-card>

    <el-card shadow="never" class="page-card page-shell__section table-page-card">
      <div class="table-shell">
        <el-table :data="list" stripe :fit="false">
          <el-table-column prop="code" label="业务键" width="140" show-overflow-tooltip>
            <template #default="{ row }">
              <span style="font-family: 'Consolas', monospace">{{ row.code }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="规则名称" width="140" show-overflow-tooltip />
          <el-table-column label="关联信息" min-width="320">
            <template #default="{ row }">
              <div v-if="row.table_name || row.code_field" class="relation-info">
                <div v-if="row.table_name">
                  <span class="info-label">表：</span>
                  <code>{{ row.table_name }}</code>
                </div>
                <div v-if="row.code_field">
                  <span class="info-label">字段：</span>
                  <code>{{ row.code_field }}</code>
                </div>
              </div>
              <span v-else class="text-placeholder">未配置</span>
            </template>
          </el-table-column>
          <el-table-column prop="segment_count" label="段数量" width="90" align="center" />
          <el-table-column prop="example" label="示例编码" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">
              <span style="font-family: 'Consolas', monospace">{{ row.example || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="启用状态" width="100" align="center">
            <template #default="{ row }">
              <el-tag v-if="row.enabled" type="success" size="small">已启用</el-tag>
              <el-tag v-else type="info" size="small">已停用</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="说明" min-width="160" show-overflow-tooltip />
          <el-table-column label="操作" width="200" fixed="right" align="left">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button link type="primary" @click="editRule(row)">编辑</el-button>
                <el-button link :type="row.enabled ? 'warning' : 'success'" @click="handleToggle(row)">
                  {{ row.enabled ? '停用' : '启用' }}
                </el-button>
                <el-button link type="danger" @click="handleDelete(row.id)">删除</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <Pagination
        :total="total"
        v-model:page="page"
        v-model:limit="pageSize"
        @pagination="fetchList"
      />
    </el-card>

    <el-drawer
      v-model="dialogVisible"
      :title="editingRule ? '编辑规则' : '新增规则'"
      direction="rtl"
      size="900px"
      :close-on-click-modal="false"
      class="code-rule-drawer"
    >
      <div class="code-rule-drawer__body">
        <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
          <div class="form-section">
            <div class="form-section__title">基础信息</div>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="业务键" prop="code">
                  <el-input
                    v-model="form.code"
                    :disabled="!!editingRule"
                    placeholder="如 customer / order"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="规则名称" prop="name">
                  <el-input v-model="form.name" placeholder="如 客户编号" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="说明" prop="description">
              <el-input
                v-model="form.description"
                type="textarea"
                :rows="2"
                placeholder="规则用途说明"
              />
            </el-form-item>
            <el-form-item label="启用状态" prop="enabled">
              <el-switch v-model="form.enabled" :active-value="1" :inactive-value="0" />
            </el-form-item>
          </div>

          <div class="form-section">
            <div class="form-section__title">
              关联信息
              <span class="form-section__tip">（可选，用于开发文档和代码校验）</span>
            </div>
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="关联表名">
                  <el-input
                    v-model="form.table_name"
                    placeholder="如 customers / orders"
                    clearable
                  />
                  <div class="form-tip">该编码规则对应的数据库表名</div>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="编号字段">
                  <el-input
                    v-model="form.code_field"
                    placeholder="如 customer_no / order_no"
                    clearable
                  />
                  <div class="form-tip">该表中存储编号的字段名</div>
                </el-form-item>
              </el-col>
            </el-row>
          </div>

          <div class="form-section">
            <div class="form-section__header">
              <div class="form-section__title">段配置（最多 5 个）</div>
              <el-button
                v-if="form.segments.length < 5"
                size="small"
                :icon="Plus"
                @click="addSegment"
              >
                添加段
              </el-button>
            </div>
            <div class="segment-table">
              <div class="segment-table__header">
                <div class="segment-table__col segment-table__col--index">序号</div>
                <div class="segment-table__col segment-table__col--type">类型</div>
                <div class="segment-table__col segment-table__col--config">配置</div>
                <div class="segment-table__col segment-table__col--actions">操作</div>
              </div>
              <div class="segment-table__body">
                <div
                  v-for="(segment, index) in form.segments"
                  :key="index"
                  class="segment-table__row"
                >
                  <div class="segment-table__col segment-table__col--index">
                    <span class="segment-index">{{ index + 1 }}</span>
                  </div>
                  <div class="segment-table__col segment-table__col--type">
                    <el-select v-model="segment.type" size="small" @change="onSegmentTypeChange(segment)">
                      <el-option label="固定字符" value="fixed" />
                      <el-option label="日期" value="date" />
                      <el-option label="流水号" value="sequence" />
                    </el-select>
                  </div>
                  <div class="segment-table__col segment-table__col--config">
                    <div class="segment-config">
                      <template v-if="segment.type === 'fixed'">
                        <div class="segment-config__item">
                          <label>值:</label>
                          <el-input v-model="segment.config.value" size="small" placeholder="如 CUS" style="width: 120px" />
                        </div>
                      </template>

                      <template v-if="segment.type === 'date'">
                        <div class="segment-config__item">
                          <label>格式:</label>
                          <el-select v-model="segment.config.format" size="small" style="width: 140px">
                            <el-option label="YYYY" value="YYYY" />
                            <el-option label="YYYYMM" value="YYYYMM" />
                            <el-option label="YYYYMMDD" value="YYYYMMDD" />
                            <el-option label="YYMM" value="YYMM" />
                            <el-option label="YYMMDD" value="YYMMDD" />
                          </el-select>
                        </div>
                      </template>

                      <template v-if="segment.type === 'sequence'">
                        <div class="segment-config__item">
                          <label>长度:</label>
                          <el-input-number v-model="segment.config.length" size="small" :min="1" :max="10" style="width: 80px" />
                        </div>
                        <div class="segment-config__item">
                          <label>起始:</label>
                          <el-input-number v-model="segment.config.start" size="small" :min="0" style="width: 80px" />
                        </div>
                        <div class="segment-config__item">
                          <label>重置:</label>
                          <el-select v-model="segment.config.resetCycle" size="small" style="width: 100px">
                            <el-option label="不重置" value="none" />
                            <el-option label="按年" value="year" />
                            <el-option label="按月" value="month" />
                            <el-option label="按日" value="day" />
                          </el-select>
                        </div>
                      </template>
                    </div>
                  </div>
                  <div class="segment-table__col segment-table__col--actions">
                    <div class="segment-actions">
                      <el-button
                        link
                        size="small"
                        :icon="ArrowUp"
                        :disabled="index === 0"
                        @click="moveSegment(index, -1)"
                      />
                      <el-button
                        link
                        size="small"
                        :icon="ArrowDown"
                        :disabled="index === form.segments.length - 1"
                        @click="moveSegment(index, 1)"
                      />
                      <el-button link size="small" type="danger" :icon="Delete" @click="removeSegment(index)" />
                    </div>
                  </div>
                </div>
              </div>
              <div v-if="form.segments.length === 0" class="segment-table__empty">
                暂无段配置，点击右上角「添加段」开始配置
              </div>
            </div>
          </div>

          <div class="form-section">
            <div class="form-section__title">实时预览</div>
            <div class="preview-box">
              <span class="preview-label">当前预览：</span>
              <span class="preview-value">{{ previewValue }}</span>
            </div>
          </div>

          <div v-if="editingRule && hasSequenceSegments" class="form-section">
            <div class="form-section__title">流水号状态</div>
            <div class="sequence-status-table">
              <div class="sequence-status-table__header">
                <div class="sequence-status-table__col sequence-status-table__col--segment">段序号</div>
                <div class="sequence-status-table__col sequence-status-table__col--type">段类型</div>
                <div class="sequence-status-table__col sequence-status-table__col--cycle">周期键</div>
                <div class="sequence-status-table__col sequence-status-table__col--value">当前值</div>
                <div class="sequence-status-table__col sequence-status-table__col--time">更新时间</div>
              </div>
              <div class="sequence-status-table__body">
                <template v-for="(segment, index) in form.segments" :key="index">
                  <template v-if="segment.type === 'sequence' && segment.sequences?.length">
                    <div
                      v-for="seq in segment.sequences"
                      :key="`${index}-${seq.cycle_key}`"
                      class="sequence-status-table__row"
                    >
                      <div class="sequence-status-table__col sequence-status-table__col--segment">
                        <span class="segment-index-small">{{ index + 1 }}</span>
                      </div>
                      <div class="sequence-status-table__col sequence-status-table__col--type">
                        流水号
                      </div>
                      <div class="sequence-status-table__col sequence-status-table__col--cycle">
                        <code>{{ seq.cycle_key }}</code>
                      </div>
                      <div class="sequence-status-table__col sequence-status-table__col--value">
                        <span class="sequence-value">{{ seq.current_seq }}</span>
                      </div>
                      <div class="sequence-status-table__col sequence-status-table__col--time">
                        {{ seq.updated_at }}
                      </div>
                    </div>
                  </template>
                </template>
              </div>
              <div v-if="!hasSequenceData" class="sequence-status-table__empty">
                暂无流水号数据（尚未生成过编码）
              </div>
            </div>
          </div>
        </el-form>
      </div>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveRule">保存</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Plus, Search, ArrowUp, ArrowDown, Delete } from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader/index.vue'
import Pagination from '@/components/Pagination/index.vue'
import {
  getCodeRuleList,
  getCodeRuleDetail,
  createCodeRule,
  updateCodeRule,
  deleteCodeRule,
  toggleCodeRule,
  previewCode
} from '@/api/codeRule'

const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const searchQuery = ref({ code: '', name: '', enabled: '' })

const dialogVisible = ref(false)
const editingRule = ref(null)
const formRef = ref()
const previewValue = ref('')

const createDefaultForm = () => ({
  code: '',
  name: '',
  description: '',
  enabled: 1,
  table_name: '',
  code_field: '',
  segments: []
})

const form = ref(createDefaultForm())

const rules = {
  code: [{ required: true, message: '请输入业务键', trigger: 'blur' }],
  name: [{ required: true, message: '请输入规则名称', trigger: 'blur' }]
}

async function fetchList() {
  try {
    const params = {
      page: page.value,
      pageSize: pageSize.value,
      ...searchQuery.value
    }
    const res = await getCodeRuleList(params)
    list.value = res.data.list || []
    total.value = res.data.total || 0
  } catch (error) {
    ElMessage.error(error?.message || '获取列表失败')
  }
}

function handleSearch() {
  page.value = 1
  fetchList()
}

function showAddDialog() {
  editingRule.value = null
  form.value = createDefaultForm()
  dialogVisible.value = true
}

async function editRule(row) {
  try {
    const res = await getCodeRuleDetail(row.id)
    editingRule.value = row
    form.value = {
      ...res.data,
      segments: res.data.segments.map(seg => ({ ...seg, expanded: false }))
    }
    dialogVisible.value = true
  } catch (error) {
    ElMessage.error(error?.message || '获取详情失败')
  }
}

async function saveRule() {
  try {
    await formRef.value.validate()

    if (!form.value.segments.length) {
      ElMessage.error('至少需要配置一个段')
      return
    }

    const submitData = {
      ...form.value,
      segments: form.value.segments.map((seg, index) => ({
        sort: index + 1,
        type: seg.type,
        config: seg.config
      }))
    }

    let result
    if (editingRule.value) {
      result = await updateCodeRule(editingRule.value.id, submitData)
    } else {
      result = await createCodeRule(submitData)
    }

    // 检查是否有警告信息
    if (result.warnings && result.warnings.length > 0) {
      const warningMsg = result.warnings.join('\n')
      await ElMessageBox.confirm(
        `${warningMsg}\n\n是否继续保存？`,
        '关联信息校验警告',
        {
          confirmButtonText: '继续保存',
          cancelButtonText: '返回修改',
          type: 'warning',
          distinguishCancelAndClose: true
        }
      )
    }

    ElMessage.success(editingRule.value ? '更新成功' : '创建成功')
    dialogVisible.value = false
    fetchList()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || '保存失败')
    }
  }
}

async function handleToggle(row) {
  try {
    await toggleCodeRule(row.id)
    ElMessage.success(row.enabled ? '已停用' : '已启用')
    fetchList()
  } catch (error) {
    ElMessage.error(error?.message || '操作失败')
  }
}

async function handleDelete(id) {
  try {
    await ElMessageBox.confirm('确定删除该规则吗？若已被使用，历史序号将被清空。', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await deleteCodeRule(id)
    ElMessage.success('删除成功')
    fetchList()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || '删除失败')
    }
  }
}

function addSegment() {
  form.value.segments.push({
    type: 'fixed',
    config: { value: '' },
    expanded: false
  })
}

function onSegmentTypeChange(segment) {
  // 切换类型时重置 config
  if (segment.type === 'fixed') {
    segment.config = { value: '' }
  } else if (segment.type === 'date') {
    segment.config = { format: 'YYYYMMDD' }
  } else if (segment.type === 'sequence') {
    segment.config = { length: 4, start: 1, reset: 'day' }
  }
}

function removeSegment(index) {
  form.value.segments.splice(index, 1)
}

function moveSegment(index, direction) {
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= form.value.segments.length) return
  const temp = form.value.segments[index]
  form.value.segments[index] = form.value.segments[newIndex]
  form.value.segments[newIndex] = temp
}

function getSegmentTypeLabel(type) {
  const map = {
    fixed: '固定字符',
    date: '日期',
    sequence: '流水号'
  }
  return map[type] || type
}

function getSegmentSummary(segment) {
  if (segment.type === 'fixed') {
    return segment.config.value || '(未设置)'
  } else if (segment.type === 'date') {
    return segment.config.format || 'YYYYMMDD'
  } else if (segment.type === 'sequence') {
    const { length, resetCycle } = segment.config
    const cycleMap = { none: '不重置', year: '按年', month: '按月', day: '按日' }
    return `${length}位 · ${cycleMap[resetCycle] || '不重置'}`
  }
  return ''
}

const hasSequenceSegments = computed(() => {
  return form.value.segments.some(seg => seg.type === 'sequence')
})

const hasSequenceData = computed(() => {
  return form.value.segments.some(seg => seg.type === 'sequence' && seg.sequences?.length > 0)
})

watch(() => form.value.segments, async () => {
  if (!form.value.segments.length) {
    previewValue.value = ''
    return
  }

  try {
    const res = await previewCode({
      segments: form.value.segments.map(seg => ({
        type: seg.type,
        config: seg.config
      })),
      params: {}
    })
    previewValue.value = res.data.preview
  } catch (error) {
    previewValue.value = '(预览失败)'
  }
}, { deep: true })

fetchList()
</script>

<style lang="scss" scoped>
.code-rule-container {
  .toolbar-card {
    margin-bottom: 0;
  }

  .table-page-card {
    overflow: hidden;
  }

  .code-rule-drawer {
    :deep(.el-drawer__body) {
      padding: 0;
      display: flex;
      flex-direction: column;
    }

    :deep(.el-drawer__footer) {
      padding: 16px 24px;
      border-top: 1px solid var(--border-light);
    }
  }

  .code-rule-drawer__body {
    flex: 1;
    min-height: 0;
    padding: 16px 24px 8px;
    overflow-y: auto;
  }

  .form-section {
    padding-bottom: 8px;

    & + .form-section {
      margin-top: 12px;
      padding-top: 20px;
      border-top: 1px solid var(--border-light);
    }
  }

  .form-section__title {
    margin-bottom: 16px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .form-section__tip {
    font-size: 12px;
    color: var(--text-secondary);
    font-weight: normal;
    margin-left: 8px;
  }

  .form-tip {
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 4px;
    line-height: 1.5;
  }

  .form-section__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .segment-table {
    border: 1px solid var(--border-light);
    border-radius: 10px;
    overflow: hidden;
  }

  .segment-table__header {
    display: flex;
    background: var(--bg-hover);
    border-bottom: 1px solid var(--border-light);
    font-weight: 600;
    font-size: 13px;
    color: var(--text-secondary);
  }

  .segment-table__body {
    background: var(--bg-card);
  }

  .segment-table__row {
    display: flex;
    border-bottom: 1px solid var(--border-lighter);

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background: var(--bg-hover);
    }
  }

  .segment-table__col {
    padding: 12px;
    display: flex;
    align-items: center;

    &--index {
      width: 60px;
      justify-content: center;
      flex-shrink: 0;
    }

    &--type {
      width: 140px;
      flex-shrink: 0;
    }

    &--config {
      flex: 1;
      min-width: 0;
    }

    &--actions {
      width: 120px;
      justify-content: center;
      flex-shrink: 0;
    }
  }

  .segment-index {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--primary-color);
    color: #fff;
    font-size: 12px;
    font-weight: 600;
  }

  .segment-config {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .segment-config__item {
    display: flex;
    align-items: center;
    gap: 6px;

    label {
      font-size: 13px;
      color: var(--text-secondary);
      white-space: nowrap;
    }
  }

  .segment-actions {
    display: flex;
    gap: 4px;
  }

  .segment-table__empty {
    padding: 40px 20px;
    text-align: center;
    color: var(--text-secondary);
    font-size: 13px;
  }

  .param-map-popover {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .param-map-popover__row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
  }

  .preview-box {
    padding: 16px;
    border: 1px solid var(--border-light);
    border-radius: 10px;
    background: var(--bg-hover);
    font-family: 'Consolas', monospace;
  }

  .preview-label {
    color: var(--text-secondary);
    margin-right: 12px;
  }

  .preview-value {
    font-size: 16px;
    font-weight: 600;
    color: var(--primary-color);
  }

  .sequence-status-table {
    border: 1px solid var(--border-light);
    border-radius: 10px;
    overflow: hidden;
  }

  .sequence-status-table__header {
    display: flex;
    background: var(--bg-hover);
    border-bottom: 1px solid var(--border-light);
    font-weight: 600;
    font-size: 13px;
    color: var(--text-secondary);
  }

  .sequence-status-table__body {
    background: var(--bg-card);
  }

  .sequence-status-table__row {
    display: flex;
    border-bottom: 1px solid var(--border-lighter);

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background: var(--bg-hover);
    }
  }

  .sequence-status-table__col {
    padding: 12px;
    display: flex;
    align-items: center;

    &--segment {
      width: 80px;
      justify-content: center;
      flex-shrink: 0;
    }

    &--type {
      width: 100px;
      flex-shrink: 0;
    }

    &--cycle {
      width: 140px;
      flex-shrink: 0;

      code {
        padding: 2px 8px;
        border-radius: 4px;
        background: var(--bg-hover);
        font-family: 'Consolas', monospace;
        font-size: 12px;
        color: var(--text-primary);
      }
    }

    &--value {
      width: 100px;
      flex-shrink: 0;
    }

    &--time {
      flex: 1;
      min-width: 0;
    }
  }

  .segment-index-small {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--primary-color);
    color: #fff;
    font-size: 11px;
    font-weight: 600;
  }

  .sequence-value {
    font-family: 'Consolas', monospace;
    font-size: 14px;
    font-weight: 600;
    color: var(--primary-color);
  }

  .sequence-status-table__empty {
    padding: 40px 20px;
    text-align: center;
    color: var(--text-secondary);
    font-size: 13px;
  }
}

.relation-info {
  font-size: 12px;
  line-height: 1.8;

  .info-label {
    color: var(--text-secondary);
    margin-right: 4px;
  }

  code {
    background: var(--bg-color);
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 12px;
    color: var(--primary-color);
    font-family: 'Consolas', monospace;
  }
}

.text-placeholder {
  color: var(--text-placeholder);
  font-size: 12px;
}
</style>

