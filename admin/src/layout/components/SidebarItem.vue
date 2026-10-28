<template>
  <div v-if="!item.meta?.hidden">
    <!-- 如果只有一个子路由，直接显示子路由 -->
    <template v-if="!item.meta?.alwaysShow && hasOneShowingChild(item.children, item) && (!onlyOneChild.children || onlyOneChild.noShowingChildren)">
      <router-link :to="resolveOnlyChildPath()">
        <el-menu-item :index="resolveOnlyChildPath()">
          <el-icon v-if="onlyOneChild.meta?.icon">
            <component :is="onlyOneChild.meta.icon" />
          </el-icon>
          <template #title>
            <span>{{ onlyOneChild.meta?.title }}</span>
          </template>
        </el-menu-item>
      </router-link>
    </template>

    <!-- 如果有多个子路由，显示子菜单 -->
    <el-sub-menu v-else :index="resolvePath(item.path)">
      <template #title>
        <el-icon v-if="item.meta?.icon">
          <component :is="item.meta.icon" />
        </el-icon>
        <span>{{ item.meta?.title }}</span>
      </template>
      <SidebarItem
        v-for="child in item.children"
        :key="child.path"
        :item="child"
        :base-path="resolvePath(item.path)"
      />
    </el-sub-menu>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import path from 'path-browserify'

const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  basePath: {
    type: String,
    default: ''
  }
})

const onlyOneChild = ref({})

const hasOneShowingChild = (children = [], parent) => {
  const showingChildren = children.filter(item => {
    if (item.meta?.hidden) {
      return false
    } else {
      onlyOneChild.value = item
      return true
    }
  })

  if (showingChildren.length === 1) {
    return true
  }

  if (showingChildren.length === 0) {
    onlyOneChild.value = { ...parent, noShowingChildren: true }
    return true
  }

  return false
}

const resolvePath = (routePath) => {
  return path.resolve(props.basePath, routePath)
}

const resolveOnlyChildPath = () => {
  if (onlyOneChild.value.noShowingChildren) {
    return resolvePath(onlyOneChild.value.path)
  }
  return path.resolve(props.basePath, props.item.path, onlyOneChild.value.path)
}
</script>
