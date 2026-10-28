/**
 * 角色常量定义
 */
export const ROLES = {
  // 超级管理员 - 隐藏用户，可访问管理平台
  ADMINISTRATOR: 'administrator',
  // 平台管理员 - 应用平台最高权限
  ADMIN: 'admin',
  // 普通用户
  USER: 'user',
  // 访客
  GUEST: 'guest'
}

/**
 * 平台类型
 */
export const PLATFORMS = {
  // 管理平台 - 系统级配置
  ADMIN: 'admin-platform',
  // 应用平台 - 业务功能
  APP: 'app-platform'
}

/**
 * 平台配置
 */
export const PLATFORM_CONFIG = {
  [PLATFORMS.ADMIN]: {
    name: '管理平台',
    icon: 'Setting',
    description: '系统配置与维护'
  },
  [PLATFORMS.APP]: {
    name: '应用平台',
    icon: 'Monitor',
    description: '业务功能管理'
  }
}

/**
 * 判断是否是超级管理员
 */
export const isAdministrator = (roles) => {
  if (!roles) return false
  return roles.includes(ROLES.ADMINISTRATOR)
}

/**
 * 判断是否可以访问管理平台
 */
export const canAccessAdminPlatform = (roles) => {
  return isAdministrator(roles)
}
