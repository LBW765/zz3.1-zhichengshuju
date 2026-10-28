export const ROLES = {
  ADMINISTRATOR: 'administrator',
  ADMIN: 'admin',
  USER: 'user',
  GUEST: 'guest'
}

export const PLATFORMS = {
  ADMIN: 'admin-platform',
  APP: 'app-platform'
}

export const isAdministrator = (roles = []) => roles.includes(ROLES.ADMINISTRATOR)
