<template>
  <div class="coming-soon page-shell">
    <PageHeader :title="title" :description="description" class="page-shell__section" />

    <el-card class="page-card page-shell__section coming-soon__card">
      <el-empty :image-size="160" description="模块规划中">
        <template #description>
          <p class="coming-soon__title">该模块功能开发中，敬请期待</p>
          <p class="coming-soon__desc">业务模块尚未启动开发，二级菜单建好后即可在此查看</p>
        </template>
      </el-empty>
    </el-card>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import PageHeader from '@/components/PageHeader/index.vue'

const route = useRoute()
const title = computed(() => route.meta?.title || '功能开发中')
const description = computed(() => `该模块属于「${title.value}」，规划已锁定，子菜单陆续上线`)
</script>

<style lang="scss" scoped>
.coming-soon {
  &__card {
    padding: 60px 20px;
  }

  &__title {
    margin: 12px 0 4px;
    font-size: 16px;
    color: var(--text-primary);
  }

  &__desc {
    margin: 0;
    color: var(--text-secondary);
    font-size: 13px;
  }
}
</style>
