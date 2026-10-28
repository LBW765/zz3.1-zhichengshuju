<template>
  <div class="work-page">
    <div class="work-page__head">
      <div><span class="eyebrow">{{ meta.en }}</span><h1>{{ meta.title }}</h1><p>{{ meta.description }}</p></div>
      <div class="work-page__head-actions"><span class="demo-data-label">{{ page === 'government' ? '演示数据' : '演示环境' }}</span><el-button v-if="['demands', 'enterprise'].includes(page)" type="primary" :icon="Plus" @click="navigate('/services/demands/new')">发布需求</el-button><el-button v-else-if="page === 'demandForm'" :icon="ArrowLeft" @click="navigate('/services/demands')">返回列表</el-button><el-button v-else-if="page === 'pilot'" type="primary" :icon="Plus" @click="openApply('pilot', pilotServices[0])">申请中试</el-button><el-button v-else-if="['events','tasks','qualification','alliance'].includes(page) && role === 'enterprise'" :icon="Document" @click="navigate('/enterprise/applications')">我的办理</el-button><el-button v-else-if="['myApplications','operations','projects'].includes(page)" :icon="Refresh" @click="loadPage">刷新</el-button></div>
    </div>
    <el-alert v-if="loadError" :title="loadError" type="error" show-icon class="page-error"><template #default><el-button text @click="loadPage">重试</el-button></template></el-alert>
    <el-skeleton v-if="loading" :rows="8" animated />

    <template v-else-if="page === 'enterprise'">
      <div class="work-metrics"><div v-for="item in enterpriseMetrics" :key="item.label"><span class="metric-icon" :class="`metric-icon--${item.tone}`"><el-icon :size="21"><component :is="item.icon" /></el-icon></span><span>{{ item.label }}</span><strong>{{ item.value }}</strong><small>{{ item.note }}</small></div></div>
      <div class="two-column"><section class="flat-section"><div class="surface-heading"><div><span class="eyebrow">MY ACTIVITY</span><h2>最近办理</h2></div><button class="text-link" @click="navigate('/enterprise/applications')">查看全部 <el-icon><ArrowRight /></el-icon></button></div><div class="activity-list"><button v-for="item in applications.slice(0,4)" :key="item.id" @click="navigate('/enterprise/applications')"><span class="activity-icon"><el-icon><Document /></el-icon></span><span><strong>{{ item.title }}</strong><small>{{ item.application_type }} · {{ dateText(item.created_at) }}</small></span><el-tag size="small" :type="statusType(item.status)">{{ item.status }}</el-tag></button><el-empty v-if="!applications.length" description="暂无办理记录" /></div></section><section class="flat-section"><div class="surface-heading"><div><span class="eyebrow">QUICK ACCESS</span><h2>常用服务</h2></div></div><div class="quick-grid"><button v-for="item in quickActions" :key="item.label" @click="navigate(item.path)"><el-icon :size="20"><component :is="item.icon" /></el-icon><span>{{ item.label }}</span><el-icon><ArrowRight /></el-icon></button></div></section></div>
      <section class="flat-section"><div class="surface-heading"><div><span class="eyebrow">OPEN SCENARIOS</span><h2>最新场景需求</h2></div><button class="text-link" @click="navigate('/services/demands')">进入供需大厅 <el-icon><ArrowRight /></el-icon></button></div><div class="compact-list"><button v-for="item in demands.slice(0,4)" :key="item.id" @click="navigate(`/services/demands/${item.id}`)"><el-tag size="small" effect="plain">{{ item.industry }}</el-tag><strong>{{ item.title }}</strong><span>{{ item.region }}</span><el-icon><ArrowRight /></el-icon></button></div></section>
    </template>

    <template v-else-if="page === 'demands'">
      <div class="page-toolbar"><el-segmented v-model="demandTab" :options="['需求广场','供给资源']" @change="loadPage" /><div class="toolbar-filters"><el-input v-model="keyword" :prefix-icon="Search" placeholder="搜索需求或方案" clearable @keyup.enter="loadPage" @clear="loadPage" /><el-select v-model="industry" placeholder="所属行业" clearable @change="loadPage"><el-option v-for="item in industries" :key="item" :label="item" :value="item" /></el-select><el-select v-if="demandTab === '需求广场'" v-model="sceneFilter" placeholder="场景标签" clearable @change="loadPage"><el-option v-for="item in sceneTags" :key="item" :label="item" :value="item" /></el-select><el-select v-if="demandTab === '需求广场'" v-model="demandStatus" placeholder="发布状态" clearable @change="loadPage"><el-option label="已发布" value="已发布" /></el-select><el-button :icon="Search" aria-label="查询" @click="loadPage" /></div></div>
      <section class="flat-section"><div v-if="demandTab === '需求广场'" class="demand-list"><button v-for="item in demands" :key="item.id" class="demand-line" @click="navigate(`/services/demands/${item.id}`)"><span class="demand-line__icon"><el-icon :size="22"><Connection /></el-icon></span><span class="demand-line__body"><span class="demand-line__top"><strong>{{ item.title }}</strong><el-tag size="small" :type="statusType(item.status)">{{ item.status }}</el-tag></span><small>{{ item.description }}</small><span class="demand-line__meta">{{ item.industry }} · {{ item.region }} · {{ item.deadline ? `截止 ${dateText(item.deadline)}` : '长期征集' }}</span></span><span class="demand-line__budget">{{ budgetText(item) }}</span><el-icon><ArrowRight /></el-icon></button><el-empty v-if="!demands.length" description="暂无符合条件的需求" /></div><div v-else class="resource-list"><button v-for="item in suppliers" :key="item.id" class="resource-line" @click="showDetail(item, 'supplier')"><span class="resource-line__icon"><el-icon :size="21"><Service /></el-icon></span><span><small>{{ item.industry }}</small><strong>{{ item.title }}</strong><em>{{ item.provider }}</em></span><span class="resource-line__tags"><el-tag v-for="tag in item.tags.slice(0,2)" :key="tag" size="small" effect="plain">{{ tag }}</el-tag></span><el-icon><ArrowRight /></el-icon></button><el-empty v-if="!suppliers.length" description="暂无符合条件的供给" /></div></section>
    </template>

    <template v-else-if="page === 'catalogDetail' && detailItem">
      <section class="flat-section"><div class="detail-overview"><div><el-tag size="small" effect="plain">{{ detailItem.subtype || detailItem.industry || '平台服务' }}</el-tag><h2>{{ detailItem.title }}</h2><p>{{ detailItem.body || detailItem.summary || detailItem.description }}</p></div><span class="detail-no">方案示例</span></div><div class="detail-grid"><div><span>提供单位</span><strong>{{ detailItem.provider || '平台演示资料' }}</strong></div><div><span>所属行业</span><strong>{{ detailItem.industry || '综合服务' }}</strong></div><div><span>当前状态</span><strong>{{ detailItem.status || '开放中' }}</strong></div><div v-if="detailItem.deadline"><span>截止日期</span><strong>{{ dateText(detailItem.deadline) }}</strong></div><div v-if="detailItem.metadata?.materials?.length"><span>材料清单</span><strong>{{ detailItem.metadata.materials.join('、') }}</strong></div><div v-if="detailItem.metadata?.process?.length"><span>办理流程</span><strong>{{ detailItem.metadata.process.join(' → ') }}</strong></div></div><div class="detail-bottom"><el-button v-if="detailApplyType" type="primary" @click="openApply(detailApplyType, detailItem)">提交申请</el-button><el-button @click="navigate('/search')">返回检索</el-button></div></section>
    </template>

    <template v-else-if="page === 'demandForm'">
      <div class="form-layout"><section class="flat-section form-main">
        <div class="surface-heading"><div><span class="eyebrow">BASIC INFORMATION</span><h2>场景需求信息</h2></div></div>
        <el-form ref="demandFormRef" :model="demandForm" :rules="demandRules" label-position="top">
          <div class="form-grid">
            <el-form-item label="需求名称" prop="title"><el-input v-model="demandForm.title" maxlength="100" show-word-limit placeholder="5-100 字" /></el-form-item>
            <el-form-item label="需求类型" prop="demandType"><el-select v-model="demandForm.demandType" placeholder="请选择需求类型"><el-option v-for="item in ['AI 转型','技术攻关','资源申请','其他']" :key="item" :label="item" :value="item" /></el-select></el-form-item>
            <el-form-item label="所属行业" prop="industry"><el-select v-model="demandForm.industry" placeholder="请选择行业"><el-option v-for="item in industries" :key="item" :label="item" :value="item" /></el-select></el-form-item>
            <el-form-item label="交付周期（月）" prop="periodMonths"><el-input-number v-model="demandForm.periodMonths" :min="1" :max="24" controls-position="right" /></el-form-item>
            <el-form-item label="需求场景" prop="scene" class="form-grid__wide"><el-input v-model="demandForm.scene" maxlength="500" placeholder="至少 10 字，描述具体应用场景" /></el-form-item>
            <el-form-item label="场景标签" class="form-grid__wide"><el-select v-model="demandForm.tags" multiple filterable allow-create default-first-option placeholder="输入或选择标签"><el-option v-for="item in sceneTags" :key="item" :label="item" :value="item" /></el-select></el-form-item>
            <el-form-item label="需求描述" prop="description" class="form-grid__wide"><el-input v-model="demandForm.description" type="textarea" :rows="5" maxlength="2000" show-word-limit placeholder="至少 20 字，说明痛点、预期效果和交付要求" /></el-form-item>
            <el-form-item label="最低预算（万元）" prop="budgetMin"><el-input-number v-model="demandForm.budgetMin" :min="0" :precision="2" controls-position="right" /></el-form-item>
            <el-form-item label="最高预算（万元）" prop="budgetMax"><el-input-number v-model="demandForm.budgetMax" :min="0" :precision="2" controls-position="right" /></el-form-item>
            <el-form-item label="所在区域"><el-input v-model="demandForm.region" placeholder="吉安市" /></el-form-item>
            <el-form-item label="联系人" prop="contact"><el-input v-model="demandForm.contact" placeholder="仅本人和运营可见" /></el-form-item>
            <el-form-item label="联系电话" prop="phone"><el-input v-model="demandForm.phone" placeholder="11 位手机号" /></el-form-item>
          </div>
        </el-form>
        <div class="form-actions"><el-button @click="navigate('/services/demands')">取消</el-button><el-button type="primary" :loading="submitting" @click="submitDemand">发布需求</el-button></div>
      </section><aside class="form-help"><span class="eyebrow">PROCESS</span><h3>办理流程</h3><ol><li><strong>提交需求</strong><small>录入真实场景与交付期望</small></li><li><strong>供需匹配</strong><small>查看方案和适配原因</small></li><li><strong>中试验证</strong><small>验证效果与场景适配</small></li></ol></aside></div>
    </template>

    <template v-else-if="page === 'demandDetail' && currentDemand">
      <div class="detail-layout"><section class="flat-section"><div class="detail-overview"><div><el-tag size="small" :type="statusType(currentDemand.status)">{{ currentDemand.status }}</el-tag><h2>{{ currentDemand.title }}</h2><p>{{ currentDemand.description }}</p></div><span class="detail-no">{{ currentDemand.demand_no }}</span></div><div class="detail-grid"><div><span>所属行业</span><strong>{{ currentDemand.industry }}</strong></div><div><span>应用场景</span><strong>{{ currentDemand.scene }}</strong></div><div><span>预算范围</span><strong>{{ budgetText(currentDemand) }}</strong></div><div><span>所在区域</span><strong>{{ currentDemand.region }}</strong></div><div><span>交付周期</span><strong>{{ currentDemand.period_months }} 个月</strong></div><div><span>发布单位</span><strong>{{ currentDemand.company }}</strong></div><div v-if="currentDemand.contact"><span>联系人</span><strong>{{ currentDemand.contact }} · {{ currentDemand.phone }}</strong></div></div><div class="detail-bottom"><el-button type="primary" :icon="DataAnalysis" @click="navigate(`/services/demands/${currentDemand.id}/matches`)">查看匹配方案</el-button><el-button @click="navigate('/services/demands')">返回大厅</el-button></div></section><aside class="flat-section timeline-section"><div class="surface-heading"><div><span class="eyebrow">PROGRESS</span><h2>办理进度</h2></div></div><el-timeline><el-timeline-item :timestamp="dateText(currentDemand.created_at)" type="success">需求已发布</el-timeline-item><el-timeline-item v-for="item in relatedApplications" :key="item.id" :timestamp="dateText(item.updated_at)" :type="statusType(item.status)">{{ item.application_type }} · {{ item.status }}</el-timeline-item></el-timeline></aside></div>
    </template>

    <template v-else-if="page === 'matches' && matchResult">
      <div class="match-banner"><div><span class="eyebrow">MATCHING RESULT</span><h2>{{ matchResult.demand.title }}</h2><p>{{ matchResult.demand.industry }} · {{ budgetText(matchResult.demand) }} · {{ matchResult.demand.region }}</p></div><span>行业 35 · 场景 35 · 预算 20 · 周期 10</span></div><section class="flat-section"><div class="surface-heading"><div><span class="eyebrow">RECOMMENDED SOLUTIONS</span><h2>推荐供给方案</h2></div><small>规则匹配 {{ matchResult.ruleVersion }} · 方案示例</small></div><div class="match-list"><button v-for="(item,index) in matchResult.items" :key="item.id" @click="showDetail(item, 'supplier')"><span class="match-rank">0{{ index + 1 }}</span><span class="match-list__content"><strong>{{ item.provider }}（方案示例）</strong><span>{{ item.title }}</span><small>{{ item.reasons.join('；') }}</small><span class="tag-row"><el-tag v-for="tag in item.tags" :key="tag" size="small" effect="plain">{{ tag }}</el-tag></span></span><span class="match-score"><strong>{{ item.score }}</strong><small>匹配分</small></span><el-icon><ArrowRight /></el-icon></button><el-empty v-if="!matchResult.items.length" description="当前条件下暂无匹配方案" /></div></section><div v-if="matchResult.items.length" class="next-step"><span><el-icon :size="20"><SetUp /></el-icon> 下一步：在真实场景中验证方案效果</span><el-button type="primary" @click="navigate(`/services/pilot?demandId=${matchResult.demand.id}&supplierId=${matchResult.items[0].id}`)">申请中试验证 <el-icon><ArrowRight /></el-icon></el-button></div>
    </template>

    <template v-else-if="page === 'resources'">
      <div class="page-toolbar"><el-segmented v-model="resourceTab" :options="resourceTabs" @change="loadPage" /><div class="toolbar-filters"><el-input v-model="keyword" :prefix-icon="Search" placeholder="搜索资源名称" clearable @keyup.enter="loadPage" @clear="loadPage" /><el-button :icon="Search" aria-label="查询" @click="loadPage" /></div></div><div class="resource-intro"><div><span class="eyebrow">RESOURCE CATALOG</span><h2>{{ resourceTab }}服务</h2><p>资源目录与申请进度统一管理，资源内容为演示示例。</p></div></div><div class="catalog-grid"><button v-for="item in catalogItems" :key="item.id" class="catalog-item" @click="showDetail(item, 'resource')"><span class="catalog-item__icon"><el-icon :size="24"><component :is="categoryIcon(item.category)" /></el-icon></span><small>{{ item.subtype }}</small><strong>{{ item.title }}</strong><p>{{ item.summary }}</p><span class="catalog-item__foot">{{ item.status }}<el-icon><TopRight /></el-icon></span></button></div><el-empty v-if="!catalogItems.length" description="暂无相关资源" /><section class="recommend-strip"><div><span class="eyebrow">SCENARIO EXPERIENCE</span><h2>场景方案推荐</h2><p>输入行业、场景、预算和周期，查看规则匹配结果。</p></div><el-button type="primary" :icon="Search" @click="recommendOpen = true">开始体验</el-button></section>
    </template>

    <template v-else-if="page === 'pilot'">
      <div class="pilot-grid"><section class="flat-section pilot-intro"><span class="eyebrow">PILOT VALIDATION</span><h2>从 AI 原型到可落地产品</h2><p>面向电子制造、智慧农业与政务场景，提供模型验证、安全评测和适配调试。</p><el-button type="primary" :icon="Plus" @click="openApply('pilot', pilotServices[0])">申请中试</el-button></section><div class="pilot-services"><button v-for="item in pilotServices" :key="item.id" @click="showDetail(item, 'pilot')"><span class="pilot-services__icon"><el-icon :size="22"><SetUp /></el-icon></span><strong>{{ item.title }}</strong><p>{{ item.summary }}</p><span>{{ item.status }}</span></button></div></div><section class="flat-section"><div class="surface-heading"><div><span class="eyebrow">TEST ENVIRONMENT</span><h2>中试测试环境</h2></div></div><div class="environment-list"><button v-for="item in environments" :key="item.id" @click="showDetail(item, 'environment')"><span class="environment-list__icon"><el-icon :size="23"><Cpu /></el-icon></span><span><strong>{{ item.title }}</strong><small>{{ item.summary }}</small></span><el-tag size="small" type="success">{{ item.status }}</el-tag><el-icon><ArrowRight /></el-icon></button></div></section><section class="flat-section"><div class="surface-heading"><div><span class="eyebrow">PILOT PROCESS</span><h2>中试服务流程</h2></div></div><div class="steps-row"><span v-for="(step,index) in ['提交申请','运营受理','中试验证','结果反馈']" :key="step"><b>{{ index + 1 }}</b>{{ step }}<el-icon v-if="index < 3"><ArrowRight /></el-icon></span></div></section>
    </template>

    <template v-else-if="['events','tasks','qualification','alliance'].includes(page)">
      <div v-if="page === 'alliance'" class="alliance-hero"><div><span class="eyebrow">JI'AN AI ALLIANCE</span><h2>吉安市人工智能产业联盟</h2><p>汇聚企业、高校、科研机构和服务商，共建开放协作的人工智能产业生态。</p><el-button type="primary" @click="openApply('alliance', catalogItems[0])">申请加入</el-button></div><el-icon :size="92"><Connection /></el-icon></div><div v-else class="page-toolbar"><el-segmented v-model="subtype" :options="ecosystemTabs" @change="loadPage" /><div class="toolbar-filters"><el-input v-model="keyword" :prefix-icon="Search" :placeholder="`搜索${meta.title}`" clearable @keyup.enter="loadPage" @clear="loadPage" /><el-button :icon="Search" aria-label="查询" @click="loadPage" /></div></div><div class="ecosystem-list"><button v-for="item in catalogItems" :key="item.id" @click="showDetail(item, page)"><span class="ecosystem-list__icon"><el-icon :size="22"><component :is="categoryIcon(item.category)" /></el-icon></span><span><small>{{ item.subtype }}</small><strong>{{ item.title }}</strong><em>{{ item.summary }}</em></span><span class="ecosystem-list__date">{{ item.deadline ? `截止 ${dateText(item.deadline)}` : item.status }}</span><el-icon><ArrowRight /></el-icon></button><el-empty v-if="!catalogItems.length" description="暂无符合条件的内容" /></div>
    </template>

    <template v-else-if="['myApplications','operations','projects'].includes(page)">
      <div v-if="page === 'projects'" class="project-filters"><el-select v-model="projectType" placeholder="项目类型" clearable @change="loadPage"><el-option v-for="item in ['中试验证','AI 资源','赛事报名','揭榜申报','资质评测','联盟入会']" :key="item" :value="item" :label="item" /></el-select><el-select v-model="projectIndustry" placeholder="所属行业" clearable @change="loadPage"><el-option v-for="item in industries" :key="item" :value="item" :label="item" /></el-select><el-date-picker v-model="projectDates" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" @change="loadPage" /></div>
      <div class="page-toolbar"><el-segmented v-model="applicationStatus" :options="applicationTabs" @change="loadPage" /><div class="toolbar-filters"><el-input v-model="keyword" :prefix-icon="Search" placeholder="搜索编号、申请或单位" clearable @keyup.enter="loadPage" @clear="loadPage" /><el-button :icon="Search" aria-label="查询" @click="loadPage" /></div></div><div class="split-work"><section class="split-work__list"><button v-for="item in applications" :key="item.id" :class="{ active: selectedApplication?.id === item.id }" @click="openApplication(item)"><div><strong>{{ item.title }}</strong><el-tag size="small" :type="statusType(item.status)">{{ item.status }}</el-tag></div><span>{{ item.company }} · {{ dateText(item.created_at) }}</span><small>{{ item.application_no }} · {{ item.application_type }}</small></button><el-empty v-if="!applications.length" description="暂无符合条件的记录" /></section><section class="split-work__detail"><template v-if="selectedApplication"><span class="eyebrow">APPLICATION DETAIL</span><div class="split-work__detail-head"><h2>{{ selectedApplication.title }}</h2><el-tag :type="statusType(selectedApplication.status)">{{ selectedApplication.status }}</el-tag></div><div class="detail-grid detail-grid--compact"><div><span>申请编号</span><strong>{{ selectedApplication.application_no }}</strong></div><div><span>服务类型</span><strong>{{ selectedApplication.application_type }}</strong></div><div><span>申请单位</span><strong>{{ selectedApplication.company }}</strong></div><div><span>申请日期</span><strong>{{ dateText(selectedApplication.created_at) }}</strong></div><div v-if="selectedApplication.demand_id"><span>关联需求</span><strong>{{ selectedApplication.demand_id }}</strong></div><div v-if="selectedApplication.supplier_id"><span>供给方案</span><strong>{{ selectedApplication.supplier_id }}</strong></div><div><span>当前状态</span><strong>{{ selectedApplication.status }}</strong></div></div><div v-if="selectedApplication.description" class="application-description"><h3>申请说明</h3><p>{{ selectedApplication.description }}</p></div><el-alert v-if="selectedApplication.return_reason" :title="`退回原因：${selectedApplication.return_reason}`" type="warning" show-icon /><div class="detail-timeline"><h3>办理时间线</h3><el-timeline><el-timeline-item v-for="event in selectedApplication.events || []" :key="event.id" :timestamp="dateText(event.created_at)" :type="statusType(event.to_status)">{{ event.actor_name }} · {{ event.to_status }}<p v-if="event.note">{{ event.note }}</p></el-timeline-item></el-timeline></div><div v-if="page === 'operations'" class="detail-actions"><el-button v-for="action in availableActions" :key="action.status" :type="action.status === '已退回' ? 'default' : 'primary'" @click="openAction(action.status)">{{ action.label }}</el-button></div><div v-if="page === 'myApplications' && selectedApplication.status === '已退回'" class="detail-actions"><el-button type="primary" @click="openAction('重新提交')">补充材料并重提</el-button></div></template><el-empty v-else description="从左侧选择一条记录" /></section></div>
    </template>

    <template v-else-if="page === 'government' && overview">
      <div class="work-metrics government-metrics"><div v-for="item in overview.metrics" :key="item.metric_key"><span class="metric-icon"><el-icon :size="21"><component :is="metricIcon(item.metric_key)" /></el-icon></span><span>{{ item.label }}</span><strong>{{ formatValue(item.value) }}<small>{{ item.unit }}</small></strong><small>{{ item.note }}</small></div></div><GovernmentCharts :trend="overview.trend" :distribution="overview.distribution" @navigate="navigate('/government/projects')" /><div class="two-column government-bottom"><section class="flat-section"><div class="surface-heading"><div><span class="eyebrow">RECENT ACTIVITY</span><h2>近期重要动态</h2></div></div><div class="news-lines news-lines--work"><button v-for="item in overview.news" :key="item.id" @click="showDetail(item, 'news')"><span>{{ item.subtype }}</span><strong>{{ item.title }}</strong><time>{{ dateText(item.created_at) }}</time></button></div></section><section class="flat-section"><div class="surface-heading"><div><span class="eyebrow">PROJECT TRACKING</span><h2>项目办理概况</h2></div><button class="text-link" @click="navigate('/government/projects')">查看台账 <el-icon><ArrowRight /></el-icon></button></div><div class="project-summary"><div v-for="item in ['待受理','处理中','已完成']" :key="item"><strong>{{ summaryCount(item) }}</strong><span>{{ item }}</span></div></div><div class="project-note">点击项目台账可查看关联需求、申请与处理记录。</div></section></div>
    </template>

    <section v-if="page === 'alliance'" class="flat-section alliance-members"><div class="surface-heading"><div><span class="eyebrow">ALLIANCE MEMBERS</span><h2>成员单位与协作组</h2></div></div><div class="ecosystem-list"><button v-for="item in allianceMembers" :key="item.id" @click="showDetail(item, 'alliance_member')"><span class="ecosystem-list__icon"><el-icon><Connection /></el-icon></span><span><small>{{ item.subtype }}</small><strong>{{ item.title }}</strong><em>{{ item.summary }}</em></span><el-icon><ArrowRight /></el-icon></button><el-empty v-if="!allianceMembers.length" description="暂无成员信息" /></div></section>
    <section v-if="page === 'pilot' && role !== 'public'" class="flat-section pilot-tasks"><div class="surface-heading"><div><span class="eyebrow">MY PILOT TASKS</span><h2>{{ role === 'enterprise' ? '我的中试申请' : '中试任务' }}</h2></div><button class="text-link" @click="navigate(role === 'enterprise' ? '/enterprise/applications' : role === 'operations' ? '/operations/applications' : '/government/projects')">查看全部 <el-icon><ArrowRight /></el-icon></button></div><div class="compact-list"><button v-for="item in pilotApplications" :key="item.id" @click="navigate(role === 'enterprise' ? '/enterprise/applications' : role === 'operations' ? '/operations/applications' : '/government/projects')"><el-tag size="small" :type="statusType(item.status)">{{ item.status }}</el-tag><strong>{{ item.title }}</strong><span>{{ dateText(item.updated_at) }}</span><el-icon><ArrowRight /></el-icon></button><el-empty v-if="!pilotApplications.length" description="暂无中试任务" /></div></section>
    <div v-if="['myApplications','operations','projects'].includes(page) && selectedApplication && (selectedApplication.attachment_id || relatedDemand)" class="application-links"><el-button v-if="selectedApplication.attachment_id" :icon="Document" @click="downloadAttachment">下载附件：{{ selectedApplication.attachment_name }}</el-button><el-button v-if="relatedDemand" :icon="Connection" @click="navigate(`/services/demands/${relatedDemand.id}`)">关联需求：{{ relatedDemand.demand_no }}</el-button></div>
    <el-drawer v-model="detailOpen" :title="detailItem?.title || '详情'" size="480px" class="demo-detail-drawer"><div v-if="detailItem" class="drawer-summary"><el-tag size="small" effect="plain">{{ detailItem.subtype || detailItem.industry || '平台服务' }}</el-tag><h2>{{ detailItem.title }}</h2><p>{{ detailItem.body || detailItem.summary || detailItem.description }}</p><div class="drawer-fields"><div><span>提供单位</span><strong>{{ detailItem.provider || '平台演示资料' }}</strong></div><div><span>状态</span><strong>{{ detailItem.status || '方案示例' }}</strong></div><div v-if="detailItem.deadline"><span>截止日期</span><strong>{{ dateText(detailItem.deadline) }}</strong></div><div v-if="detailItem.metadata?.period"><span>任务周期</span><strong>{{ detailItem.metadata.period }}</strong></div><div v-if="detailItem.metadata?.reward"><span>奖励口径</span><strong>{{ detailItem.metadata.reward }}</strong></div><div v-if="detailItem.metadata?.materials?.length"><span>材料清单</span><strong>{{ detailItem.metadata.materials.join('、') }}</strong></div><div v-if="detailItem.metadata?.process?.length"><span>办理流程</span><strong>{{ detailItem.metadata.process.join(' → ') }}</strong></div></div></div><template #footer><el-button @click="detailOpen = false">关闭</el-button><el-button @click="navigate(`/detail/${detailItem?.category ? 'catalog' : 'supplier'}/${detailItem.id}`)">独立详情</el-button><el-button v-if="detailApplyType && role === 'enterprise'" type="primary" @click="openApply(detailApplyType, detailItem)">提交申请</el-button></template></el-drawer>

    <el-dialog v-model="applyOpen" :title="applyTarget ? `${applyTarget.title}申请` : '服务申请'" width="min(600px, 94vw)">
      <el-form :model="applicationForm" label-position="top">
        <el-form-item label="申请单位"><el-input :model-value="store.user?.company" disabled /></el-form-item>
        <template v-if="applyType === 'pilot'">
          <el-form-item label="关联需求" required><el-select v-model="applicationForm.demandId" placeholder="请选择本人需求"><el-option v-for="item in ownDemands" :key="item.id" :label="item.title" :value="item.id" /></el-select></el-form-item>
          <el-form-item label="供给方案" required><el-select v-model="applicationForm.supplierId" placeholder="请选择供给方案"><el-option v-for="item in availableSuppliers" :key="item.id" :label="item.title" :value="item.id" /></el-select></el-form-item>
          <el-form-item label="服务类型" required><el-select v-model="applicationForm.serviceType"><el-option v-for="item in ['模型效果验证','安全合规评测','场景适配调试']" :key="item" :label="item" :value="item" /></el-select></el-form-item>
          <el-form-item label="测试环境"><el-select v-model="applicationForm.environmentId" clearable placeholder="可选"><el-option v-for="item in environments" :key="item.id" :label="item.title" :value="item.id" /></el-select></el-form-item>
        </template>
        <el-form-item label="联系人" required><el-input v-model="applicationForm.contact" placeholder="请输入联系人" /></el-form-item>
        <el-form-item label="联系电话" required><el-input v-model="applicationForm.phone" placeholder="11 位手机号" /></el-form-item>
        <el-form-item label="申请说明" required><el-input v-model="applicationForm.description" type="textarea" :rows="4" placeholder="至少 10 字，描述申请场景与预期目标" /></el-form-item>
        <el-form-item label="附件"><el-upload :auto-upload="false" :file-list="uploadFiles" :limit="1" accept=".pdf,.png,.jpg,.jpeg,.docx" :on-change="onFileChange" :on-remove="onFileRemove"><el-button :icon="Document">选择附件</el-button><template #tip><div class="el-upload__tip">PDF、PNG、JPG 或 DOCX，最大 10 MB</div></template></el-upload></el-form-item>
      </el-form>
      <template #footer><el-button @click="applyOpen = false">取消</el-button><el-button type="primary" :loading="submitting" @click="submitApplication">提交申请</el-button></template>
    </el-dialog>

    <el-dialog v-model="actionOpen" :title="actionStatus === '重新提交' ? '补充材料并重提' : `更新为${actionStatus}`" width="min(480px, 94vw)"><el-form label-position="top"><el-form-item :label="actionStatus === '重新提交' ? '补充说明' : '处理说明'" :required="['重新提交','已退回'].includes(actionStatus)"><el-input v-model="actionNote" type="textarea" :rows="4" placeholder="填写处理说明" /></el-form-item></el-form><template #footer><el-button @click="actionOpen = false">取消</el-button><el-button type="primary" :loading="submitting" @click="submitAction">确认</el-button></template></el-dialog>

    <el-dialog v-model="recommendOpen" title="场景方案推荐" width="min(640px, 94vw)"><el-form label-position="top"><div class="form-grid"><el-form-item label="所属行业" required><el-select v-model="recommend.industry" placeholder="选择行业"><el-option v-for="item in industries" :key="item" :label="item" :value="item" /></el-select></el-form-item><el-form-item label="应用场景" required><el-input v-model="recommend.scene" placeholder="例如：PCB 质检" /></el-form-item><el-form-item label="预算上限（万元）"><el-input-number v-model="recommend.budgetMax" :min="0" /></el-form-item><el-form-item label="交付周期（月）"><el-input-number v-model="recommend.periodMonths" :min="1" :max="24" /></el-form-item></div></el-form><div v-if="recommendResult" class="recommend-result"><span class="eyebrow">推荐供给方案</span><strong>{{ recommendResult.title }}</strong><p>{{ recommendResult.reasons.join('；') }} · 匹配分 {{ recommendResult.score }}</p></div><el-empty v-if="recommendSearched && !recommendResult" description="暂无符合条件的方案" /><template #footer><el-button @click="recommendOpen = false">关闭</el-button><el-button type="primary" @click="runRecommendation">查看推荐</el-button></template></el-dialog>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, ArrowRight, Connection, Cpu, DataAnalysis, Document, Plus, Refresh, Search, Service, SetUp, TopRight } from '@element-plus/icons-vue'
import { aiApi } from '@/api/aiDemo'
import { useAiDemoStore } from '@/store/aiDemo'
import GovernmentCharts from './governmentCharts.vue'

const props = defineProps({ page: { type: String, required: true }, role: { type: String, required: true } })
const emit = defineEmits(['navigate'])
const route = useRoute()
const store = useAiDemoStore()
const navigate = path => emit('navigate', path)
const metaMap = {
  enterprise: ['ENTERPRISE WORKSPACE','企业工作台','聚合场景需求、服务申请与办理进度。'],
  catalogDetail: ['RESOURCE DETAIL','资源详情','查看资源信息与服务申请入口。'],
  demands: ['DEMAND & SUPPLY','供需大厅','让场景需求与 AI 技术供给精准连接。'],
  demandForm: ['PUBLISH A DEMAND','发布场景需求','描述场景痛点和预期目标，寻找适配的技术方案。'],
  demandDetail: ['DEMAND DETAIL','需求详情','查看场景信息、匹配方案和办理进度。'],
  matches: ['SMART MATCHING','智能匹配','按行业、场景、预算和周期进行可解释的规则匹配。'],
  resources: ['AI SERVICE CENTER','AI 服务中心','算力、模型、数据和智能体统一展示与申请。'],
  pilot: ['PILOT VALIDATION','中试验证中心','用场景检验模型效果、安全与适配能力。'],
  events: ['EVENTS','赛事活动','发现创新项目，汇聚技术、人才与成果。'],
  tasks: ['OPEN CHALLENGES','揭榜挂帅','面向重点产业场景公开征集技术攻关方案。'],
  qualification: ['ASSESSMENT','资质与评测','企业认定、产品检测与科技伦理审查服务。'],
  alliance: ['INDUSTRY ALLIANCE','产业联盟','促进资源共享、场景共创和成果转化。'],
  myApplications: ['MY APPLICATIONS','我的办理','集中查看申请进度与处理记录。'],
  operations: ['OPERATIONS','运营受理台','统一受理企业申请并跟踪服务进度。'],
  government: ['GOVERNMENT OVERVIEW','政府综合管理','产业发展态势与重点项目进度一屏掌握。'],
  projects: ['PROJECT REGISTER','项目台账','按项目类型、状态和企业查看全周期记录。']
}
const meta = computed(() => { const [en,title,description] = metaMap[props.page] || metaMap.enterprise; return { en,title,description } })
const industries = ['电子信息制造','现代农业','文旅服务','政务治理']
const sceneTags = ['PCB 质检','视觉识别','小样本','病虫害识别','农情监测','数字人','知识问答','智能客服','知识检索']
const quickActions = [
  { label:'发布场景需求', icon:'EditPen', path:'/services/demands/new' },
  { label:'申请算力资源', icon:'Cpu', path:'/ai/resources' },
  { label:'申请中试验证', icon:'SetUp', path:'/services/pilot' },
  { label:'我的办理', icon:'Document', path:'/enterprise/applications' }
]
const loading = ref(false)
const loadError = ref('')
const demands = ref([])
const ownDemands = ref([])
const suppliers = ref([])
const catalogItems = ref([])
const allianceMembers = ref([])
const pilotServices = ref([])
const environments = ref([])
const applications = ref([])
const pilotApplications = computed(() => applications.value.filter(item => item.target_type === 'pilot'))
const currentDemand = ref(null)
const matchResult = ref(null)
const overview = ref(null)
const detailOpen = ref(false)
const detailItem = ref(null)
const detailApplyType = ref('')
const selectedApplication = ref(null)
const relatedDemand = ref(null)
const keyword = ref('')
const industry = ref('')
const sceneFilter = ref('')
const demandStatus = ref('')
const demandTab = ref('需求广场')
const resourceTab = ref('算力')
const resourceTabs = ['算力','模型','数据','智能体']
const resourceCategory = { 算力:'compute', 模型:'model', 数据:'data', 智能体:'agent' }
const categoryByPage = { events:'event', tasks:'task', qualification:'qualification', alliance:'alliance' }
const subtype = ref('全部')
const ecosystemTabs = computed(() => ({ events:['全部','创新创业','行业挑战','技术竞赛'], tasks:['全部','重点攻关','工业 AI','智慧农业'], qualification:['全部','资质认定','技术评测','合规服务'] })[props.page] || ['全部'])
const applicationStatus = ref('全部')
const projectType = ref('')
const projectIndustry = ref('')
const projectDates = ref([])
const applicationTabs = ['全部','待受理','已受理','处理中','已完成','已退回']
const demandId = computed(() => Number(route.path.match(/\/services\/demands\/(\d+)/)?.[1]))
const relatedApplications = computed(() => applications.value.filter(item => item.demand_id === currentDemand.value?.id))
const enterpriseMetrics = computed(() => [
  { label:'我的需求', value:demands.value.length, note:'已发布的场景需求', icon:'Connection', tone:'teal' },
  { label:'服务申请', value:applications.value.length, note:'申请总数', icon:'Document', tone:'blue' },
  { label:'待处理事项', value:applications.value.filter(item => ['待受理','已退回'].includes(item.status)).length, note:'待受理或需补件', icon:'Bell', tone:'orange' },
  { label:'已完成服务', value:applications.value.filter(item => item.status === '已完成').length, note:'已办结申请', icon:'CircleCheck', tone:'green' }
])

async function loadPage() {
  loading.value = true; loadError.value = ''
  try {
    if (props.page === 'enterprise') {
      const [d,a] = await Promise.all([aiApi.demands({}), aiApi.applications({})]); demands.value = d.items.filter(item => item.created_by === store.user?.id); applications.value = a.items
    } else if (props.page === 'demands') {
      if (demandTab.value === '需求广场') demands.value = (await aiApi.demands({ q:keyword.value, industry:industry.value, scene:sceneFilter.value, status:demandStatus.value })).items
      else suppliers.value = (await aiApi.suppliers({ q:keyword.value, industry:industry.value })).items
    } else if (props.page === 'catalogDetail') {
      const match = route.path.match(/\/detail\/(catalog|supplier)\/(\d+)$/)
      detailItem.value = match?.[1] === 'supplier' ? await aiApi.supplierDetail(match[2]) : await aiApi.catalogDetail(match[2])
      detailApplyType.value = ({ compute:'resource', model:'resource', data:'resource', agent:'resource', pilot:'pilot', event:'event', task:'task', qualification:'qualification', alliance:'alliance' })[detailItem.value.category] || ''
    } else if (props.page === 'demandDetail') {
      currentDemand.value = await aiApi.demandDetail(demandId.value)
      applications.value = props.role === 'enterprise' ? (await aiApi.applications({})).items : []
    } else if (props.page === 'matches') {
      matchResult.value = await aiApi.matches(demandId.value)
    } else if (props.page === 'resources') {
      catalogItems.value = (await aiApi.catalog({ category:resourceCategory[resourceTab.value], q:keyword.value })).items
    } else if (props.page === 'pilot') {
      const [services, env, own, supply] = await Promise.all([aiApi.catalog({ category:'pilot' }), aiApi.catalog({ category:'environment' }), aiApi.demands({}), aiApi.suppliers({})])
      pilotServices.value = services.items; environments.value = env.items; ownDemands.value = own.items.filter(item => item.created_by === store.user?.id); suppliers.value = supply.items
      applications.value = props.role === 'public' ? [] : (await aiApi.applications({})).items
    } else if (categoryByPage[props.page]) {
      catalogItems.value = (await aiApi.catalog({ category:categoryByPage[props.page], subtype:subtype.value === '全部' ? '' : subtype.value, q:keyword.value })).items
      if (props.page === 'alliance') allianceMembers.value = (await aiApi.catalog({ category:'alliance_member' })).items
    } else if (['myApplications','operations','projects'].includes(props.page)) {
      const filters = { status:applicationStatus.value === '全部' ? '' : applicationStatus.value, q:keyword.value }
      if (props.page === 'projects') Object.assign(filters, { type:projectType.value, industry:projectIndustry.value, from:projectDates.value?.[0], to:projectDates.value?.[1] })
      const result = props.page === 'projects' ? await aiApi.projects(filters) : props.page === 'operations' ? await aiApi.operationsApplications(filters) : await aiApi.applications(filters)
      applications.value = result.items
      selectedApplication.value = null
      const selectedId = Number(route.path.match(/\/(\d+)$/)?.[1])
      if (selectedId) await selectApplication(applications.value.find(item => item.id === selectedId) || { id: selectedId })
      else if (applications.value.length) await selectApplication(applications.value[0])
    } else if (props.page === 'government') overview.value = await aiApi.overview()
  } catch (error) { loadError.value = error.message } finally { loading.value = false }
}
watch(() => [props.page, route.params.pathMatch], () => { keyword.value=''; subtype.value='全部'; applicationStatus.value='全部'; loadPage() }, { immediate:true })

const demandForm = reactive({ title:'', demandType:'', industry:'', scene:'', description:'', tags:[], budgetMin:undefined, budgetMax:undefined, periodMonths:6, region:'吉安市', contact:'', phone:'' })
const demandFormRef = ref(null)
const demandRules = {
  title: [{ required:true, min:5, max:100, message:'需求名称需为 5-100 字', trigger:'blur' }],
  demandType: [{ required:true, message:'请选择需求类型', trigger:'change' }],
  industry: [{ required:true, message:'请选择所属行业', trigger:'change' }],
  scene: [{ required:true, min:10, message:'需求场景至少 10 字', trigger:'blur' }],
  description: [{ required:true, min:20, max:2000, message:'需求描述需为 20-2000 字', trigger:'blur' }],
  contact: [{ required:true, message:'请填写联系人', trigger:'blur' }],
  phone: [{ required:true, pattern:/^1\d{10}$/, message:'请填写 11 位手机号', trigger:'blur' }],
  budgetMax: [{ validator: (_rule,value,done) => (value == null) !== (demandForm.budgetMin == null) || (value != null && value < demandForm.budgetMin) ? done(new Error('预算需同时填写，且最高值不能低于最低值')) : done(), trigger:'change' }]
}
const submitting = ref(false)
async function submitDemand() {
  if (props.role !== 'enterprise') return navigate('/login')
  try { await demandFormRef.value.validate() } catch (_error) { return ElMessage.warning('请检查表单中标出的字段') }
  submitting.value = true
  try {
    const created = await aiApi.createDemand(demandForm)
    ElMessage.success('需求发布成功')
    navigate(`/services/demands/${created.id}`)
  } catch (error) { ElMessage.error(error.message) } finally { submitting.value = false }
}

async function showDetail(item, source) {
  detailApplyType.value = source === 'supplier' || source === 'environment' || source === 'news' ? '' : source === 'resource' ? 'resource' : source === 'pilot' ? 'pilot' : ({ events:'event', tasks:'task', qualification:'qualification', alliance:'alliance' })[source] || ''
  try { detailItem.value = source === 'supplier' ? item : await aiApi.catalogDetail(item.id); detailOpen.value = true } catch (error) { ElMessage.error(error.message) }
}
const applyOpen = ref(false)
const applyType = ref('')
const applyTarget = ref(null)
const applyStatuses = { pilot:['可申请'], resource:['可申请','授权申请'], event:['报名中'], task:['征集中'], qualification:['可申请'], alliance:['开放申请'] }
const canApply = (type, target) => applyStatuses[type]?.includes(target?.status) && (!target.deadline || dateText(target.deadline) >= new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' }))
const applicationForm = reactive({ contact:'', phone:'', description:'', demandId:null, supplierId:null, serviceType:'模型效果验证', environmentId:null })
const availableSuppliers = computed(() => {
  const demand = ownDemands.value.find(item => item.id === applicationForm.demandId)
  return demand ? suppliers.value.filter(item => item.industry === demand.industry) : []
})
const attachmentFile = ref(null)
const uploadFiles = ref([])
const onFileChange = file => { attachmentFile.value = file.raw; uploadFiles.value = [file] }
const onFileRemove = () => { attachmentFile.value = null; uploadFiles.value = [] }
async function openApply(type, target) {
  detailOpen.value = false
  if (props.role !== 'enterprise') return props.role === 'public' ? navigate(`/login?redirect=${encodeURIComponent(route.fullPath)}`) : ElMessage.warning('请切换至企业身份提交申请')
  if (!target) return ElMessage.warning('请选择服务项目')
  if (!canApply(type, target)) return ElMessage.warning('该项目暂未开放申请或已截止')
  applyType.value = type; applyTarget.value = target
  attachmentFile.value = null
  uploadFiles.value = []
  Object.assign(applicationForm, { contact:'', phone:'', description:'', demandId:Number(route.query.demandId) || null, supplierId:Number(route.query.supplierId) || null, serviceType:target.title || '模型效果验证', environmentId:null })
  if (type === 'pilot' && !ownDemands.value.length) {
    try { const [own,supply,env] = await Promise.all([aiApi.demands({}),aiApi.suppliers({}),aiApi.catalog({category:'environment'})]); ownDemands.value=own.items.filter(item => item.created_by === store.user.id); suppliers.value=supply.items; environments.value=env.items } catch (error) { return ElMessage.error(error.message) }
  }
  applyOpen.value = true
}
async function submitApplication() {
  if (!applyTarget.value || !applicationForm.contact.trim() || !/^1\d{10}$/.test(applicationForm.phone) || applicationForm.description.trim().length < 10) return ElMessage.warning('请填写联系人、11 位手机号和至少 10 字申请说明')
  if (applyType.value === 'pilot' && (!applicationForm.demandId || !applicationForm.supplierId || !applicationForm.serviceType)) return ElMessage.warning('请选择关联需求、供给方案和中试服务类型')
  if (attachmentFile.value && attachmentFile.value.size > 10 * 1024 * 1024) return ElMessage.warning('附件不能超过 10 MB')
  submitting.value = true
  try {
    const attachment = attachmentFile.value ? await aiApi.upload(attachmentFile.value) : null
    await aiApi.createApplication({ targetType:applyType.value, targetId:applyTarget.value.id, ...applicationForm, attachmentId:attachment?.id })
    applyOpen.value = false; ElMessage.success('申请提交成功'); navigate('/enterprise/applications')
  } catch (error) { ElMessage.error(error.message) } finally { submitting.value = false }
}
async function selectApplication(item) {
  try {
    selectedApplication.value = await aiApi.applicationDetail(item.id)
    relatedDemand.value = props.page === 'projects' && item.demand_id ? await aiApi.demandDetail(item.demand_id) : null
  } catch (error) { ElMessage.error(error.message) }
}
const applicationPath = { myApplications: '/enterprise/applications', operations: '/operations/applications', projects: '/government/projects' }
const openApplication = item => navigate(`${applicationPath[props.page]}/${item.id}`)
async function downloadAttachment() {
  try { await aiApi.downloadAttachment(selectedApplication.value.attachment_id, selectedApplication.value.attachment_name) } catch (error) { ElMessage.error(error.message) }
}
const availableActions = computed(() => ({ 待受理:[{status:'已受理',label:'受理申请'},{status:'已退回',label:'退回补件'}], 已受理:[{status:'处理中',label:'开始办理'},{status:'已退回',label:'退回补件'}], 处理中:[{status:'已完成',label:'完成办理'},{status:'已退回',label:'退回补件'}] })[selectedApplication.value?.status] || [])
const actionOpen = ref(false)
const actionStatus = ref('')
const actionNote = ref('')
const openAction = status => { actionStatus.value=status; actionNote.value=''; actionOpen.value=true }
async function submitAction() {
  if (['重新提交','已退回'].includes(actionStatus.value) && actionNote.value.trim().length < 10) return ElMessage.warning('请填写至少 10 字说明')
  submitting.value = true
  try {
    if (actionStatus.value === '重新提交') await aiApi.resubmit(selectedApplication.value.id, actionNote.value)
    else await aiApi.updateStatus(selectedApplication.value.id, actionStatus.value, actionNote.value)
    actionOpen.value = false; ElMessage.success('办理状态已更新'); await loadPage()
  } catch (error) { ElMessage.error(error.message) } finally { submitting.value = false }
}

const recommendOpen = ref(false)
const recommend = reactive({ industry:'', scene:'', budgetMax:undefined, periodMonths:6 })
const recommendResult = ref(null)
const recommendSearched = ref(false)
async function runRecommendation() {
  if (!recommend.industry || recommend.scene.trim().length < 2) return ElMessage.warning('请选择行业并填写应用场景')
  try {
    const result = await aiApi.recommend(recommend)
    recommendResult.value = result.items[0] || null; recommendSearched.value = true
  } catch (error) { ElMessage.error(error.message) }
}

const statusType = status => ({ 已发布:'success', 征集中:'success', 待受理:'warning', 已受理:'primary', 处理中:'primary', 已完成:'success', 已退回:'danger' })[status] || 'info'
const dateText = value => String(value || '').slice(0,10)
const budgetText = row => row.budget_min == null ? '预算面议' : `${Number(row.budget_min)}-${Number(row.budget_max)} 万元`
const formatValue = value => Number(value) % 1 ? Number(value) : Number(value).toFixed(0)
const categoryIcon = category => ({ compute:'Cpu', model:'MagicStick', data:'Files', agent:'ChatDotRound', event:'Medal', task:'Trophy', qualification:'Stamp', alliance:'Connection' })[category] || 'Document'
const metricIcon = key => ({ companies:'OfficeBuilding', output:'TrendCharts', projects:'FolderOpened', algorithms:'CircleCheck' })[key] || 'DataLine'
const summaryCount = status => overview.value?.summary?.find(item => item.status === status)?.total || 0
</script>
