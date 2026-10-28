export const getSystemInfo = () => uni.getSystemInfoSync()

export const getStatusBarHeight = () => getSystemInfo().statusBarHeight || 0
