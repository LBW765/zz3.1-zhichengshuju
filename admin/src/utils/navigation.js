export const getTabHome = (tab) => {
  const findFirstLeaf = (menu, parentPath) => {
    const fullPath = menu.path.startsWith('/')
      ? menu.path
      : `${parentPath}/${menu.path}`.replace(/\/+/g, '/')

    if (menu.children?.length) {
      const childPath = findFirstLeaf(menu.children[0], fullPath)
      if (childPath) return childPath
    }

    if (!menu.component && menu.redirect) {
      return menu.redirect
    }

    if (!menu.component) {
      return null
    }

    return fullPath
  }

  if (tab.redirect) return tab.redirect
  if (tab.children?.length) return findFirstLeaf(tab.children[0], tab.path) || tab.path
  return `${tab.path}/index`.replace(/\/+/g, '/')
}
