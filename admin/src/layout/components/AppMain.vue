<template>
  <section class="app-main" :class="appMainClasses">
    <div class="app-main__content" :class="{ 'app-main__content--contained': isPageLayout }">
      <router-view v-slot="{ Component, route }">
        <transition name="fade-transform" mode="out-in">
          <keep-alive :include="cachedViews">
            <component :is="Component" :key="route.path" />
          </keep-alive>
        </transition>
      </router-view>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useTagsViewStore } from '@/store/tagsView'

const props = defineProps({
  hasTagsView: {
    type: Boolean,
    default: true
  },
  isPageLayout: {
    type: Boolean,
    default: false
  }
})

const tagsViewStore = useTagsViewStore()

const cachedViews = computed(() => tagsViewStore.cachedViews)
const appMainClasses = computed(() => ({
  'app-main--page': props.isPageLayout,
  'app-main--with-tags': props.hasTagsView && !props.isPageLayout,
  'app-main--standalone': !props.hasTagsView
}))
</script>

<style lang="scss" scoped>
.app-main {
  height: calc(100vh - var(--header-height));
  width: 100%;
  position: relative;
  overflow-x: hidden;
  overflow-y: auto;
  padding: var(--page-padding);
  margin-top: 0;
  background-color: var(--bg-color);
  box-sizing: border-box;

  &.app-main--with-tags {
    height: calc(100vh - var(--header-height) - var(--tags-height));
    margin-top: var(--tags-height);
  }

  &.app-main--page,
  &.app-main--standalone {
    padding: var(--page-padding-lg);
  }

  .app-main__content {
    min-height: 100%;
    min-width: 0;

    &.app-main__content--contained {
      max-width: var(--page-max-width);
      margin: 0 auto;
      min-width: 0;
    }
  }

  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 3px;

    &:hover {
      background: var(--text-light);
    }
  }
}

@media (max-width: 768px) {
  .app-main {
    padding: var(--page-padding);

    &.app-main--page,
    &.app-main--standalone {
      padding: var(--page-padding);
    }
  }
}

:deep(.page-shell) {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
  gap: var(--page-section-gap);
  min-height: 100%;
  min-width: 0;
}

:deep(.page-shell__section) {
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

:deep(.page-grid) {
  width: 100%;
}

:deep(.page-grid > .el-col) {
  min-width: 0;
}

:deep(.page-card) {
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

:deep(.page-card .el-card__body) {
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

:deep(.page-toolbar) {
  width: 100%;
}

:deep(.page-toolbar__row) {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}

:deep(.page-toolbar__row > *) {
  min-width: 0;
}

:deep(.page-toolbar__filters) {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  flex: 1 1 auto;
  min-width: 0;
}

:deep(.page-toolbar__filters > *) {
  min-width: 0;
}

:deep(.page-toolbar__actions) {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  flex: 0 0 auto;
  margin-left: auto;
}

:deep(.page-toolbar__actions > *) {
  min-width: 0;
}

:deep(.page-toolbar__search) {
  width: min(360px, 100%);
}

:deep(.page-toolbar .search-bar),
:deep(.page-toolbar .search-bar__fields),
:deep(.page-toolbar .search-bar__actions) {
  gap: 16px;
}

:deep(.page-toolbar .search-bar) {
  align-items: flex-start;
}

:deep(.page-toolbar .search-bar__item) {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
}

:deep(.page-toolbar .search-bar__label) {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  line-height: 20px;
  padding-right: 2px;
}

:deep(.page-toolbar .el-input),
:deep(.page-toolbar .el-select),
:deep(.page-toolbar .el-date-editor) {
  max-width: 100%;
}

:deep(.page-header-actions) {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

:deep(.page-text-truncate) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fade-transform-leave-active,
.fade-transform-enter-active {
  transition: all 0.25s ease;
}

.fade-transform-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.fade-transform-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
