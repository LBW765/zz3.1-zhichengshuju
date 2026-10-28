<template>
  <div class="page-shell">
    <PageHeader title="车间与产线" description="管理车间、产线与班组的组织结构" class="page-shell__section">
      <template #extra>
        <el-button :icon="Refresh" @click="refreshAll">刷新</el-button>
        <el-button :icon="Upload" @click="importVisible = true">导入车间</el-button>
        <el-button :icon="Download" @click="exportVisible = true">导出车间</el-button>
      </template>
    </PageHeader>

    <div class="split-panel page-shell__section">
      <!-- 左侧：组织结构树 -->
      <div class="split-panel__left" style="width: 300px; min-width: 300px;">
        <div class="panel-header">
          <span class="panel-header__title">组织结构</span>
          <span class="panel-header__actions">
            <el-button type="primary" size="small" :icon="Plus" circle title="新增车间" @click="showWorkshopDialog()" />
          </span>
        </div>
        <div class="tree-area" v-loading="treeLoading">
          <el-tree
            v-if="treeData.length"
            ref="orgTreeRef"
            :data="treeData"
            :props="treeProps"
            default-expand-all
            highlight-current
            node-key="key"
            @node-click="handleNodeClick"
          >
            <template #default="{ data }">
              <div class="org-node" :class="{ 'org-node--active': selectedNode?.key === data.key }">
                <el-icon class="org-node__icon">
                  <OfficeBuilding v-if="data.level === 'workshop'" />
                  <SetUp v-else-if="data.level === 'line'" />
                  <User v-else />
                </el-icon>
                <span class="org-node__label">{{ data.label }}</span>
                <div class="org-node__actions" @click.stop>
                  <template v-if="data.level === 'workshop'">
                    <el-button type="primary" link size="small" @click.stop="showLineDialog(data)">加产线</el-button>
                    <el-button type="primary" link size="small" @click.stop="showWorkshopDialog(data.raw)">编辑</el-button>
                    <el-button type="danger" link size="small" @click.stop="handleDeleteWorkshop(data.raw)">删除</el-button>
                  </template>
                  <template v-else-if="data.level === 'line'">
                    <el-button type="primary" link size="small" @click.stop="showTeamDialog(data)">加班组</el-button>
                    <el-button type="primary" link size="small" @click.stop="showLineDialog(data.parentNode, data.raw)">编辑</el-button>
                    <el-button type="danger" link size="small" @click.stop="handleDeleteLine(data)">删除</el-button>
                  </template>
                  <template v-else>
                    <el-button type="primary" link size="small" @click.stop="showTeamDialog(data.parentNode, data.raw)">编辑</el-button>
                    <el-button type="danger" link size="small" @click.stop="handleDeleteTeam(data)">删除</el-button>
                  </template>
                </div>
              </div>
            </template>
          </el-tree>
          <el-empty v-else description="暂无车间" :image-size="60" />
        </div>
      </div>

      <!-- 右侧：详情面板 -->
      <div class="split-panel__right">
        <!-- 车间详情 -->
        <template v-if="selectedNode?.level === 'workshop'">
          <div class="panel-header">
            <span class="panel-header__title">{{ selectedNode.raw.workshopName }} — 详情</span>
          </div>
          <div class="detail-card">
            <div class="detail-card__grid">
              <div class="detail-card__item"><span class="detail-card__label">车间编码</span><span>{{ selectedNode.raw.workshopCode }}</span></div>
              <div class="detail-card__item"><span class="detail-card__label">车间名称</span><span>{{ selectedNode.raw.workshopName }}</span></div>
              <div class="detail-card__item"><span class="detail-card__label">类型</span><span>{{ selectedNode.raw.workshopType || '-' }}</span></div>
              <div class="detail-card__item"><span class="detail-card__label">负责人</span><span>{{ selectedNode.raw.manager || '-' }}</span></div>
              <div class="detail-card__item"><span class="detail-card__label">联系电话</span><span>{{ selectedNode.raw.phone || '-' }}</span></div>
              <div class="detail-card__item"><span class="detail-card__label">面积</span><span>{{ selectedNode.raw.area != null ? selectedNode.raw.area + ' m²' : '-' }}</span></div>
              <div class="detail-card__item"><span class="detail-card__label">状态</span><el-tag :type="selectedNode.raw.status ? 'success' : 'info'" size="small">{{ selectedNode.raw.status ? '启用' : '停用' }}</el-tag></div>
            </div>
          </div>
          <div class="sub-table-section">
            <div class="sub-table-section__header">
              <span>下属产线</span>
              <el-tag size="small" round>{{ workshopLines.length }}</el-tag>
            </div>
            <div class="table-shell">
              <el-table :data="workshopLines" size="small" stripe :fit="false" v-loading="detailLoading">
                <el-table-column prop="lineCode" label="产线编码" min-width="120" show-overflow-tooltip />
                <el-table-column prop="lineName" label="产线名称" min-width="140" show-overflow-tooltip />
                <el-table-column prop="lineType" label="类型" width="100" />
                <el-table-column label="日产能" width="100" align="center">
                  <template #default="{ row }">{{ row.dailyCapacity != null ? row.dailyCapacity : '-' }}</template>
                </el-table-column>
                <el-table-column prop="manager" label="负责人" width="100" />
                <el-table-column label="班组" width="60" align="center">
                  <template #default="{ row }">{{ row.teamCount }}</template>
                </el-table-column>
                <el-table-column label="状态" width="70" align="center">
                  <template #default="{ row }">
                    <el-tag :type="row.status ? 'success' : 'info'" size="small">{{ row.status ? '启用' : '停用' }}</el-tag>
                  </template>
                </el-table-column>
                <template #empty><el-empty description="暂无产线" :image-size="40" /></template>
              </el-table>
            </div>
          </div>
        </template>

        <!-- 产线详情 -->
        <template v-else-if="selectedNode?.level === 'line'">
          <div class="panel-header">
            <span class="panel-header__title">{{ selectedNode.raw.lineName }} — 详情</span>
          </div>
          <div class="detail-card">
            <div class="detail-card__grid">
              <div class="detail-card__item"><span class="detail-card__label">产线编码</span><span>{{ selectedNode.raw.lineCode }}</span></div>
              <div class="detail-card__item"><span class="detail-card__label">产线名称</span><span>{{ selectedNode.raw.lineName }}</span></div>
              <div class="detail-card__item"><span class="detail-card__label">类型</span><span>{{ selectedNode.raw.lineType || '-' }}</span></div>
              <div class="detail-card__item"><span class="detail-card__label">日产能</span><span>{{ selectedNode.raw.dailyCapacity != null ? selectedNode.raw.dailyCapacity : '-' }}</span></div>
              <div class="detail-card__item"><span class="detail-card__label">负责人</span><span>{{ selectedNode.raw.manager || '-' }}</span></div>
              <div class="detail-card__item"><span class="detail-card__label">状态</span><el-tag :type="selectedNode.raw.status ? 'success' : 'info'" size="small">{{ selectedNode.raw.status ? '启用' : '停用' }}</el-tag></div>
            </div>
          </div>
          <div class="sub-table-section">
            <div class="sub-table-section__header">
              <span>下属班组</span>
              <el-tag size="small" round>{{ lineTeams.length }}</el-tag>
            </div>
            <div class="table-shell">
              <el-table :data="lineTeams" size="small" stripe :fit="false" v-loading="detailLoading">
                <el-table-column prop="teamCode" label="班组编码" min-width="120" show-overflow-tooltip />
                <el-table-column prop="teamName" label="班组名称" min-width="140" show-overflow-tooltip />
                <el-table-column prop="shiftType" label="班次" width="80" />
                <el-table-column prop="leader" label="组长" width="100" />
                <el-table-column label="人数上限" width="90" align="center">
                  <template #default="{ row }">{{ row.maxMembers != null ? row.maxMembers : '-' }}</template>
                </el-table-column>
                <el-table-column label="现有人数" width="90" align="center">
                  <template #default="{ row }">{{ row.memberCount }}</template>
                </el-table-column>
                <el-table-column label="状态" width="70" align="center">
                  <template #default="{ row }">
                    <el-tag :type="row.status ? 'success' : 'info'" size="small">{{ row.status ? '启用' : '停用' }}</el-tag>
                  </template>
                </el-table-column>
                <template #empty><el-empty description="暂无班组" :image-size="40" /></template>
              </el-table>
            </div>
          </div>
        </template>

        <!-- 班组详情 -->
        <template v-else-if="selectedNode?.level === 'team'">
          <div class="panel-header">
            <span class="panel-header__title">{{ selectedNode.raw.teamName }} — 详情</span>
          </div>
          <div class="detail-card">
            <div class="detail-card__grid">
              <div class="detail-card__item"><span class="detail-card__label">班组编码</span><span>{{ selectedNode.raw.teamCode }}</span></div>
              <div class="detail-card__item"><span class="detail-card__label">班组名称</span><span>{{ selectedNode.raw.teamName }}</span></div>
              <div class="detail-card__item"><span class="detail-card__label">班次</span><span>{{ selectedNode.raw.shiftType || '-' }}</span></div>
              <div class="detail-card__item"><span class="detail-card__label">组长</span><span>{{ selectedNode.raw.leader || '-' }}</span></div>
              <div class="detail-card__item"><span class="detail-card__label">人数上限</span><span>{{ selectedNode.raw.maxMembers != null ? selectedNode.raw.maxMembers : '-' }}</span></div>
              <div class="detail-card__item"><span class="detail-card__label">状态</span><el-tag :type="selectedNode.raw.status ? 'success' : 'info'" size="small">{{ selectedNode.raw.status ? '启用' : '停用' }}</el-tag></div>
            </div>
          </div>
          <div class="sub-table-section">
            <div class="sub-table-section__header">
              <span>关联人员</span>
              <el-tag size="small" round>{{ teamMembers.length }}</el-tag>
              <el-button type="primary" size="small" :icon="Plus" @click="showMemberDialog" style="margin-left: auto;">添加人员</el-button>
            </div>
            <div class="table-shell">
              <el-table :data="teamMembers" size="small" stripe :fit="false" v-loading="detailLoading">
                <el-table-column prop="nickName" label="姓名" min-width="120" show-overflow-tooltip>
                  <template #default="{ row }">{{ row.nickName || row.username }}</template>
                </el-table-column>
                <el-table-column prop="roleInTeam" label="角色" width="100" />
                <el-table-column prop="phone" label="电话" min-width="140" />
                <el-table-column prop="joinedAt" label="加入时间" min-width="160" />
                <el-table-column label="操作" width="80" fixed="right" align="left">
                  <template #default="{ row }">
                    <div class="table-actions">
                      <el-button type="danger" link size="small" @click="handleRemoveMember(row)">移除</el-button>
                    </div>
                  </template>
                </el-table-column>
                <template #empty><el-empty description="暂无人员" :image-size="40" /></template>
              </el-table>
            </div>
          </div>
        </template>

        <!-- 空态 -->
        <el-empty v-else description="请从左侧选择一个节点" :image-size="120" class="empty-placeholder" />
      </div>
    </div>

    <!-- 车间弹窗 -->
    <el-dialog
      v-model="workshopDialogVisible"
      :title="editingWorkshop ? '编辑车间' : '新增车间'"
      width="600px"
      :close-on-click-modal="false"
      @closed="handleWorkshopDialogClosed"
    >
      <el-form ref="workshopFormRef" :model="workshopForm" :rules="workshopRules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="车间编码" prop="workshopCode">
              <el-input v-model="workshopForm.workshopCode" placeholder="如 WS-003" :disabled="!!editingWorkshop" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="车间名称" prop="workshopName">
              <el-input v-model="workshopForm.workshopName" placeholder="请输入车间名称" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="车间类型">
              <el-select v-model="workshopForm.workshopType" placeholder="请选择" clearable style="width: 100%">
                <el-option label="加工" value="加工" />
                <el-option label="装配" value="装配" />
                <el-option label="检测" value="检测" />
                <el-option label="仓储" value="仓储" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="面积(m²)">
              <el-input v-model.number="workshopForm.area" placeholder="面积" type="number" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="负责人">
              <el-select v-model="workshopForm.managerUserId" filterable clearable placeholder="请选择负责人" style="width: 100%" @change="handleWorkshopManagerChange">
                <el-option
                  v-for="employee in employeeOptions"
                  :key="employee.id"
                  :label="formatEmployeeOptionLabel(employee)"
                  :value="employee.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系电话">
              <el-input v-model="workshopForm.phone" placeholder="请输入联系电话" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="地址">
          <el-input v-model="workshopForm.address" placeholder="请输入车间地址" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="状态">
              <el-switch v-model="workshopForm.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="停用" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注">
          <el-input v-model="workshopForm.remark" type="textarea" :rows="2" maxlength="500" show-word-limit placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="workshopDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveWorkshop">保存</el-button>
      </template>
    </el-dialog>

    <!-- 产线弹窗 -->
    <el-dialog
      v-model="lineDialogVisible"
      :title="editingLine ? '编辑产线' : '新增产线'"
      width="600px"
      :close-on-click-modal="false"
      @closed="handleLineDialogClosed"
    >
      <el-form ref="lineFormRef" :model="lineForm" :rules="lineRules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="产线编码" prop="lineCode">
              <el-input v-model="lineForm.lineCode" placeholder="如 PL-004" :disabled="!!editingLine" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="产线名称" prop="lineName">
              <el-input v-model="lineForm.lineName" placeholder="请输入产线名称" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="产线类型">
              <el-select v-model="lineForm.lineType" placeholder="请选择" clearable style="width: 100%">
                <el-option label="加工线" value="加工线" />
                <el-option label="装配线" value="装配线" />
                <el-option label="包装线" value="包装线" />
                <el-option label="检测线" value="检测线" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="日产能">
              <el-input v-model.number="lineForm.dailyCapacity" placeholder="日产能" type="number" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="负责人">
              <el-select v-model="lineForm.managerUserId" filterable clearable placeholder="请选择负责人" style="width: 100%" @change="handleLineManagerChange">
                <el-option
                  v-for="employee in employeeOptions"
                  :key="employee.id"
                  :label="formatEmployeeOptionLabel(employee)"
                  :value="employee.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-switch v-model="lineForm.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="停用" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注">
          <el-input v-model="lineForm.remark" type="textarea" :rows="2" maxlength="500" show-word-limit placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="lineDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveLine">保存</el-button>
      </template>
    </el-dialog>

    <!-- 班组弹窗 -->
    <el-dialog
      v-model="teamDialogVisible"
      :title="editingTeam ? '编辑班组' : '新增班组'"
      width="500px"
      :close-on-click-modal="false"
      @closed="handleTeamDialogClosed"
    >
      <el-form ref="teamFormRef" :model="teamForm" :rules="teamRules" label-width="100px">
        <el-form-item label="班组编码" prop="teamCode">
          <el-input v-model="teamForm.teamCode" placeholder="如 TM-004" :disabled="!!editingTeam" />
        </el-form-item>
        <el-form-item label="班组名称" prop="teamName">
          <el-input v-model="teamForm.teamName" placeholder="请输入班组名称" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="班次">
              <el-select v-model="teamForm.shiftType" placeholder="请选择" clearable style="width: 100%">
                <el-option label="白班" value="白班" />
                <el-option label="夜班" value="夜班" />
                <el-option label="中班" value="中班" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="组长">
              <el-select v-model="teamForm.leaderUserId" filterable clearable placeholder="请选择组长" style="width: 100%" @change="handleLeaderChange">
                <el-option
                  v-for="employee in employeeOptions"
                  :key="employee.id"
                  :label="formatEmployeeOptionLabel(employee)"
                  :value="employee.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="人数上限">
              <el-input v-model.number="teamForm.maxMembers" placeholder="不限" type="number" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-switch v-model="teamForm.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="停用" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注">
          <el-input v-model="teamForm.remark" type="textarea" :rows="2" maxlength="500" show-word-limit placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="teamDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveTeam">保存</el-button>
      </template>
    </el-dialog>

    <!-- 添加人员弹窗 -->
    <el-dialog
      v-model="memberDialogVisible"
      title="添加人员"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="memberForm" label-width="100px">
        <el-form-item label="选择人员">
          <el-select v-model="memberForm.userId" filterable placeholder="搜索并选择人员" style="width: 100%">
            <el-option
              v-for="u in availableUsers"
              :key="u.id"
              :label="`${u.nickName || u.username}${u.phone ? ' (' + u.phone + ')' : ''}`"
              :value="u.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="memberForm.roleInTeam" placeholder="请选择" style="width: 100%">
            <el-option label="组长" value="组长" />
            <el-option label="副组长" value="副组长" />
            <el-option label="组员" value="组员" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="memberDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveMember" :disabled="!memberForm.userId">确定</el-button>
      </template>
    </el-dialog>

    <!-- 车间导入 -->
    <ImportDialog
      v-model="importVisible"
      title="导入车间"
      :columns="importColumns"
      template-file-name="车间导入模板"
      :import-fn="importWorkshop"
      @success="handleImportSuccess"
    />

    <ExportDialog
      v-model="exportVisible"
      title="导出车间"
      :fields="exportFields"
      :allow-selected="false"
      :current-page-count="treeData.length"
      :total-count="treeData.length"
      :export-fn="handleExport"
    />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download, Refresh, Plus, OfficeBuilding, SetUp, Upload, User } from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader/index.vue'
import ImportDialog from '@/components/ImportDialog/index.vue'
import ExportDialog from '@/components/ExportDialog/index.vue'
import { runDialogExport } from '@/utils/exportDialog'
import { getNextCode } from '@/api/codeRule'
import {
  getWorkshopList, getWorkshopDetail, createWorkshop, updateWorkshop, deleteWorkshop,
  getProductionLineDetail, createProductionLine, updateProductionLine, deleteProductionLine,
  getWorkTeamDetail, createWorkTeam, updateWorkTeam, deleteWorkTeam,
  addTeamMember, removeTeamMember, getAvailableUsers, getWorkshopEmployeeOptions,
  importWorkshop
} from '@/api/basicData'

// ========== 组织结构树 ==========

const orgTreeRef = ref(null)
const treeData = ref([])
const treeLoading = ref(false)
const selectedNode = ref(null)
const treeProps = { children: 'children', label: 'label' }
const employeeOptions = ref([])
let employeeOptionsLoaded = false

function formatEmployeeOptionLabel(employee) {
  const name = employee?.displayName || employee?.name || employee?.empNo || ''
  const code = employee?.empNo ? `${employee.empNo} - ${name}` : name
  return employee?.phone ? `${code} (${employee.phone})` : code
}

function findEmployeeOption(employeeId) {
  return employeeOptions.value.find(item => item.id === employeeId) || null
}

function findEmployeeIdByName(name) {
  if (!name) return null
  const normalized = String(name).trim()
  return employeeOptions.value.find(item => item.displayName === normalized || item.name === normalized || item.empNo === normalized)?.id || null
}

async function fetchEmployeeOptions() {
  try {
    const res = await getWorkshopEmployeeOptions()
    employeeOptions.value = Array.isArray(res.data) ? res.data : []
    employeeOptionsLoaded = true
  } catch (e) {
    console.error(e)
    employeeOptions.value = []
  }
}

async function ensureEmployeeOptions() {
  if (!employeeOptionsLoaded) await fetchEmployeeOptions()
}

function syncWorkshopManagerFields(userId) {
  const employee = findEmployeeOption(userId)
  workshopForm.value.manager = employee?.displayName || ''
  workshopForm.value.phone = employee?.phone || ''
}

function handleWorkshopManagerChange(userId) {
  syncWorkshopManagerFields(userId)
}

function syncLineManagerFields(userId) {
  const employee = findEmployeeOption(userId)
  lineForm.value.manager = employee?.displayName || ''
}

function handleLineManagerChange(userId) {
  syncLineManagerFields(userId)
}

function syncLeaderFields(userId) {
  const employee = findEmployeeOption(userId)
  teamForm.value.leader = employee?.displayName || ''
}

function handleLeaderChange(userId) {
  syncLeaderFields(userId)
}

async function fetchTree() {
  treeLoading.value = true
  try {
    const res = await getWorkshopList()
    const workshops = res.data || []

    const nodes = []
    for (const ws of workshops) {
      const detail = await getWorkshopDetail(ws.id)
      const wsData = detail.data || ws
      const lines = wsData.lines || []

      const lineNodes = []
      for (const ln of lines) {
        let teamNodes = []
        if (ln.teamCount > 0) {
          const lineDetail = await getProductionLineDetail(ws.id, ln.id)
          const teams = lineDetail.data?.teams || []
          teamNodes = teams.map(t => ({
            key: `team-${t.id}`,
            label: t.teamName,
            level: 'team',
            raw: t,
            parentNode: { key: `line-${ln.id}`, raw: ln, workshopId: ws.id },
            children: []
          }))
        }

        lineNodes.push({
          key: `line-${ln.id}`,
          label: ln.lineName,
          level: 'line',
          raw: ln,
          workshopId: ws.id,
          parentNode: { key: `ws-${ws.id}`, raw: wsData },
          children: teamNodes
        })
      }

      nodes.push({
        key: `ws-${ws.id}`,
        label: wsData.workshopName,
        level: 'workshop',
        raw: wsData,
        children: lineNodes
      })
    }

    treeData.value = nodes

    if (selectedNode.value) {
      const reselect = findNode(nodes, selectedNode.value.key)
      selectedNode.value = reselect || null
      if (selectedNode.value) {
        loadRightPanel()
      }
    }
  } catch (e) {
    console.error(e)
  } finally {
    treeLoading.value = false
  }
}

function findNode(nodes, key) {
  for (const n of nodes) {
    if (n.key === key) return n
    if (n.children) {
      const found = findNode(n.children, key)
      if (found) return found
    }
  }
  return null
}

function handleNodeClick(data) {
  selectedNode.value = data
  loadRightPanel()
}

function refreshAll() {
  selectedNode.value = null
  workshopLines.value = []
  lineTeams.value = []
  teamMembers.value = []
  fetchTree()
}

// ========== 右侧详情 ==========

const detailLoading = ref(false)
const workshopLines = ref([])
const lineTeams = ref([])
const teamMembers = ref([])

async function loadRightPanel() {
  if (!selectedNode.value) return
  detailLoading.value = true
  try {
    const node = selectedNode.value
    if (node.level === 'workshop') {
      const res = await getWorkshopDetail(node.raw.id)
      workshopLines.value = res.data?.lines || []
    } else if (node.level === 'line') {
      const res = await getProductionLineDetail(node.workshopId, node.raw.id)
      lineTeams.value = res.data?.teams || []
    } else if (node.level === 'team') {
      const res = await getWorkTeamDetail(node.parentNode.raw.id, node.raw.id)
      teamMembers.value = res.data?.members || []
    }
  } catch (e) {
    console.error(e)
  } finally {
    detailLoading.value = false
  }
}

// ========== 车间弹窗 ==========

const workshopDialogVisible = ref(false)
const editingWorkshop = ref(null)
const workshopFormRef = ref(null)

function defaultWorkshopForm() {
  return { workshopCode: '', workshopName: '', workshopType: '', manager: '', managerUserId: null, phone: '', area: null, address: '', status: 1, remark: '' }
}
const workshopForm = ref(defaultWorkshopForm())
const workshopRules = {
  workshopCode: [{ required: true, message: '请输入车间编码', trigger: 'blur' }],
  workshopName: [{ required: true, message: '请输入车间名称', trigger: 'blur' }]
}

async function showWorkshopDialog(ws) {
  await ensureEmployeeOptions()
  if (ws) {
    editingWorkshop.value = ws
    workshopForm.value = {
      workshopCode: ws.workshopCode,
      workshopName: ws.workshopName,
      workshopType: ws.workshopType || '',
      manager: ws.manager || '',
      managerUserId: findEmployeeIdByName(ws.manager),
      phone: ws.phone || '',
      area: ws.area,
      address: ws.address || '',
      status: ws.status,
      remark: ws.remark || ''
    }
  } else {
    editingWorkshop.value = null
    workshopForm.value = defaultWorkshopForm()
    getNextCode('workshop').then(res => {
      if (res.data?.preview) workshopForm.value.workshopCode = res.data.preview
    }).catch(() => {})
  }
  workshopDialogVisible.value = true
}

function handleWorkshopDialogClosed() {
  workshopFormRef.value?.resetFields()
  editingWorkshop.value = null
}

async function saveWorkshop() {
  try {
    await workshopFormRef.value.validate()
    if (editingWorkshop.value) {
      const { workshopCode, ...payload } = workshopForm.value
      await updateWorkshop(editingWorkshop.value.id, payload)
      ElMessage.success('车间更新成功')
    } else {
      await createWorkshop(workshopForm.value)
      ElMessage.success('车间添加成功')
    }
    workshopDialogVisible.value = false
    await fetchTree()
  } catch (e) {
    if (e?.message) console.error(e)
  }
}

async function handleDeleteWorkshop(ws) {
  try {
    await ElMessageBox.confirm(`确定删除车间「${ws.workshopName}」吗？`, '提示', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
    })
    await deleteWorkshop(ws.id)
    ElMessage.success('删除成功')
    if (selectedNode.value?.key === `ws-${ws.id}`) selectedNode.value = null
    await fetchTree()
  } catch (e) {
    if (e !== 'cancel') console.error(e)
  }
}

// ========== 产线弹窗 ==========

const lineDialogVisible = ref(false)
const editingLine = ref(null)
const lineFormRef = ref(null)
let currentLineWorkshopId = null

function defaultLineForm() {
  return { lineCode: '', lineName: '', lineType: '', dailyCapacity: null, manager: '', managerUserId: null, status: 1, remark: '' }
}
const lineForm = ref(defaultLineForm())
const lineRules = {
  lineCode: [{ required: true, message: '请输入产线编码', trigger: 'blur' }],
  lineName: [{ required: true, message: '请输入产线名称', trigger: 'blur' }]
}

async function showLineDialog(workshopNode, line) {
  await ensureEmployeeOptions()
  currentLineWorkshopId = workshopNode.raw?.id || workshopNode.raw?.id
  if (line) {
    editingLine.value = line
    lineForm.value = {
      lineCode: line.lineCode,
      lineName: line.lineName,
      lineType: line.lineType || '',
      dailyCapacity: line.dailyCapacity,
      manager: line.manager || '',
      managerUserId: findEmployeeIdByName(line.manager),
      status: line.status,
      remark: line.remark || ''
    }
  } else {
    editingLine.value = null
    lineForm.value = defaultLineForm()
    getNextCode('production_line').then(res => {
      if (res.data?.preview) lineForm.value.lineCode = res.data.preview
    }).catch(() => {})
  }
  lineDialogVisible.value = true
}

function handleLineDialogClosed() {
  lineFormRef.value?.resetFields()
  editingLine.value = null
}

async function saveLine() {
  try {
    await lineFormRef.value.validate()
    if (editingLine.value) {
      const { lineCode, ...payload } = lineForm.value
      await updateProductionLine(currentLineWorkshopId, editingLine.value.id, payload)
      ElMessage.success('产线更新成功')
    } else {
      await createProductionLine(currentLineWorkshopId, lineForm.value)
      ElMessage.success('产线添加成功')
    }
    lineDialogVisible.value = false
    await fetchTree()
  } catch (e) {
    if (e?.message) console.error(e)
  }
}

async function handleDeleteLine(lineNode) {
  try {
    await ElMessageBox.confirm(`确定删除产线「${lineNode.raw.lineName}」吗？`, '提示', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
    })
    await deleteProductionLine(lineNode.workshopId, lineNode.raw.id)
    ElMessage.success('删除成功')
    if (selectedNode.value?.key === lineNode.key) selectedNode.value = null
    await fetchTree()
  } catch (e) {
    if (e !== 'cancel') console.error(e)
  }
}

// ========== 班组弹窗 ==========

const teamDialogVisible = ref(false)
const editingTeam = ref(null)
const teamFormRef = ref(null)
let currentTeamLineId = null

function defaultTeamForm() {
  return { teamCode: '', teamName: '', shiftType: '', leader: '', leaderUserId: null, maxMembers: null, status: 1, remark: '' }
}
const teamForm = ref(defaultTeamForm())
const teamRules = {
  teamCode: [{ required: true, message: '请输入班组编码', trigger: 'blur' }],
  teamName: [{ required: true, message: '请输入班组名称', trigger: 'blur' }]
}

async function showTeamDialog(lineNode, team) {
  await ensureEmployeeOptions()
  currentTeamLineId = lineNode.raw?.id
  if (team) {
    editingTeam.value = team
    teamForm.value = {
      teamCode: team.teamCode,
      teamName: team.teamName,
      shiftType: team.shiftType || '',
      leader: team.leader || '',
      leaderUserId: findEmployeeIdByName(team.leader),
      maxMembers: team.maxMembers,
      status: team.status,
      remark: team.remark || ''
    }
  } else {
    editingTeam.value = null
    teamForm.value = defaultTeamForm()
    getNextCode('work_team').then(res => {
      if (res.data?.preview) teamForm.value.teamCode = res.data.preview
    }).catch(() => {})
  }
  teamDialogVisible.value = true
}

function handleTeamDialogClosed() {
  teamFormRef.value?.resetFields()
  editingTeam.value = null
}

async function saveTeam() {
  try {
    await teamFormRef.value.validate()
    if (editingTeam.value) {
      const { teamCode, ...payload } = teamForm.value
      await updateWorkTeam(currentTeamLineId, editingTeam.value.id, payload)
      ElMessage.success('班组更新成功')
    } else {
      await createWorkTeam(currentTeamLineId, teamForm.value)
      ElMessage.success('班组添加成功')
    }
    teamDialogVisible.value = false
    await fetchTree()
  } catch (e) {
    if (e?.message) console.error(e)
  }
}

async function handleDeleteTeam(teamNode) {
  try {
    await ElMessageBox.confirm(`确定删除班组「${teamNode.raw.teamName}」吗？`, '提示', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
    })
    await deleteWorkTeam(teamNode.parentNode.raw.id, teamNode.raw.id)
    ElMessage.success('删除成功')
    if (selectedNode.value?.key === teamNode.key) selectedNode.value = null
    await fetchTree()
  } catch (e) {
    if (e !== 'cancel') console.error(e)
  }
}

// ========== 班组人员 ==========

const memberDialogVisible = ref(false)
const availableUsers = ref([])
const memberForm = ref({ userId: null, roleInTeam: '组员' })

async function showMemberDialog() {
  memberForm.value = { userId: null, roleInTeam: '组员' }
  try {
    const res = await getAvailableUsers(selectedNode.value.raw.id)
    availableUsers.value = res.data || []
  } catch (e) {
    console.error(e)
  }
  memberDialogVisible.value = true
}

async function saveMember() {
  try {
    await addTeamMember(selectedNode.value.raw.id, memberForm.value)
    ElMessage.success('添加成功')
    memberDialogVisible.value = false
    loadRightPanel()
    fetchTree()
  } catch (e) {
    console.error(e)
  }
}

async function handleRemoveMember(member) {
  try {
    await ElMessageBox.confirm(`确定移除「${member.nickName || member.username}」吗？`, '提示', {
      confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning'
    })
    await removeTeamMember(selectedNode.value.raw.id, member.id)
    ElMessage.success('移除成功')
    loadRightPanel()
    fetchTree()
  } catch (e) {
    if (e !== 'cancel') console.error(e)
  }
}

// ========== 导入导出 ==========

const importVisible = ref(false)
const exportVisible = ref(false)

const importColumns = [
  { key: 'workshopCode', label: '车间编码', required: true, example: 'WS-001', width: 14 },
  { key: 'workshopName', label: '车间名称', required: true, example: '机加工车间', width: 16 },
  { key: 'workshopType', label: '车间类型', example: '加工车间', width: 14, note: '加工车间/装配车间/仓储车间/检测车间' },
  { key: 'manager', label: '负责人', example: '张三', width: 10 },
  { key: 'phone', label: '联系电话', example: '13800138000', width: 14 },
  { key: 'area', label: '面积(m²)', example: '500', width: 10 },
  { key: 'address', label: '地址', example: '厂区A栋', width: 18 },
  { key: 'sort', label: '排序', example: '0', width: 8 },
  { key: 'remark', label: '备注', example: '', width: 20 }
]

const exportFields = [
  { key: 'workshopCode', label: '车间编码', width: 14 },
  { key: 'workshopName', label: '车间名称', width: 16 },
  { key: 'workshopType', label: '车间类型', width: 14 },
  { key: 'manager', label: '负责人', width: 10 },
  { key: 'phone', label: '联系电话', width: 14 },
  { key: 'area', label: '面积(m²)', width: 10 },
  { key: 'address', label: '地址', width: 18 },
  { key: 'sort', label: '排序', width: 8 },
  { key: 'status', label: '状态', width: 10, formatter: (v) => v === 1 ? '启用' : '停用' },
  { key: 'remark', label: '备注', width: 20 }
]

function handleImportSuccess() {
  fetchTree()
}

async function handleExport({ scope, fields }) {
  const data = treeData.value.map(node => node.raw).filter(Boolean)
  await runDialogExport({
    scope,
    fields,
    allFields: exportFields,
    currentRows: data,
    fetchAll: async () => data,
    fileName: '车间'
  })
}

onMounted(() => {
  fetchEmployeeOptions()
  fetchTree()
})
</script>

<style lang="scss" scoped>
.split-panel {
  display: flex;
  gap: 16px;
  min-height: 500px;
}

.split-panel__left {
  background: var(--bg-card);
  border-radius: var(--radius-base, 8px);
  border: 1px solid var(--border-lighter);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.split-panel__right {
  flex: 1;
  min-width: 0;
  background: var(--bg-card);
  border-radius: var(--radius-base, 8px);
  border: 1px solid var(--border-lighter);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  padding: 16px 16px 12px;
  border-bottom: 1px solid var(--border-lighter);
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

.tree-area {
  flex: 1;
  overflow: auto;
  padding: 8px;
}

.org-node {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 2px 0;

  &__icon {
    font-size: 16px;
    color: var(--text-secondary);
    flex-shrink: 0;
  }

  &__label {
    font-size: 13px;
    color: var(--text-primary);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__actions {
    display: none;
    gap: 2px;
    flex-shrink: 0;
  }

  &:hover &__actions {
    display: flex;
  }
}

.detail-card {
  padding: 16px;
  border-bottom: 1px solid var(--border-lighter);

  &__grid {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 32px;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--text-regular);
  }

  &__label {
    color: var(--text-light);
    flex-shrink: 0;

    &::after {
      content: ':';
    }
  }
}

.sub-table-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0 16px 16px;

  &__header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }
}

.empty-placeholder {
  margin: auto;
}
</style>
