<template>
  <el-breadcrumb class="app-breadcrumb" separator="/">
    <transition-group name="breadcrumb">
      <el-breadcrumb-item v-for="(item, index) in levelList" :key="item.path">
        <span v-if="index === levelList.length - 1" class="no-redirect">
          {{ item.meta.title }}
        </span>
        <a v-else @click.prevent="handleLink(item)">
          {{ item.meta.title }}
        </a>
      </el-breadcrumb-item>
    </transition-group>
  </el-breadcrumb>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const levelList = ref([])

const getBreadcrumb = () => {
  let matched = route.matched.filter(item => item.meta && item.meta.title)
  levelList.value = matched
}

const handleLink = (item) => {
  router.push(item.path)
}

watch(
  () => route.path,
  () => {
    getBreadcrumb()
  },
  { immediate: true }
)
</script>

<style lang="scss" scoped>
.app-breadcrumb {
  display: flex;
  align-items: center;
  height: var(--header-height);
  font-size: 14px;

  :deep(.el-breadcrumb__inner) {
    color: var(--text-secondary);
    font-weight: 400;
  }

  :deep(.el-breadcrumb__separator) {
    color: var(--text-light);
    font-weight: 400;
  }

  .no-redirect {
    color: var(--text-secondary);
    cursor: text;
    font-weight: 500;
  }

  a {
    color: var(--text-regular);
    font-weight: 400;
    transition: color 0.2s;

    &:hover {
      color: var(--primary-color);
    }
  }
}

.breadcrumb-enter-active,
.breadcrumb-leave-active {
  transition: all 0.25s ease;
}

.breadcrumb-enter-from,
.breadcrumb-leave-active {
  opacity: 0;
  transform: translateX(10px);
}

.breadcrumb-leave-active {
  position: absolute;
}
</style>
