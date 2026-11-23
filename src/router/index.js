import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

// 说明：所有页面改为按路由懒加载（() => import(...)）。
// 此前 16 个视图全部静态 import，会被打进同一个首包——访客只看首页，
// 却要同时下载后台管理、地图、灯箱等全部页面代码。

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  /**
   * 滚动行为
   *
   * 默认 vue-router 不处理滚动，导致 SPA 内浏览器"后退"会丢失原来的阅读位置。
   * - 有 savedPosition（浏览器前进/后退）→ 恢复原位
   * - 目标带 scrollTo（从详情返回合集/首页并定位到某张）→ 交给页面自己处理，
   *   这里返回 false，避免先跳到顶部再滚过去
   * - 有 hash → 滚到锚点
   * - 其余 → 回到顶部
   */
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.query && to.query.scrollTo) return false
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
  routes: [
    // ===== 前台路由 =====
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue')
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/AboutView.vue')
    },
    {
      path: '/photo/:id',
      name: 'photoDetail',
      component: () => import('../views/PhotoDetailView.vue')
    },
    {
      path: '/collections',
      name: 'collections',
      component: () => import('../views/CollectionListView.vue')
    },
    {
      path: '/collections/:id',
      name: 'collectionDetail',
      component: () => import('../views/CollectionDetailView.vue')
    },
    {
      path: '/map',
      name: 'map',
      component: () => import('../views/MapView.vue')
    },
    {
      path: '/share/:code',
      name: 'shareView',
      component: () => import('../views/ShareView.vue')
    },

    // ===== 管理员路由 =====
    // requires 取值与后端权限标记一一对应：
    //   upload → photo:upload（管理员或 canUpload）
    //   manage → photo:manage（管理员或 canManage）
    //   admin  → user:manage（仅管理员）
    {
      path: '/admin/login',
      name: 'adminLogin',
      component: () => import('../views/admin/LoginView.vue'),
      meta: { requiresGuest: true }
    },
    {
      path: '/admin',
      component: () => import('../views/admin/AdminLayout.vue'),
      meta: { requiresAuth: true },
      redirect: '/admin/dashboard',
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('../views/admin/DashboardView.vue'),
          meta: { title: '数据概览' }
        },
        {
          path: 'upload',
          name: 'upload',
          component: () => import('../views/admin/UploadView.vue'),
          meta: { title: '上传图片', requiresAuth: true, requires: 'upload' }
        },
        {
          path: 'photos',
          name: 'photos',
          component: () => import('../views/admin/PhotoManageView.vue'),
          meta: { title: '照片管理', requiresAuth: true, requires: 'manage' }
        },
        {
          path: 'categories',
          name: 'categories',
          component: () => import('../views/admin/CategoryView.vue'),
          meta: { title: '分类管理', requiresAuth: true, requires: 'manage' }
        },
        {
          path: 'tags',
          name: 'tags',
          component: () => import('../views/admin/TagManageView.vue'),
          meta: { title: '标签管理', requiresAuth: true, requires: 'manage' }
        },
        {
          path: 'collections',
          name: 'adminCollections',
          component: () => import('../views/admin/CollectionManageView.vue'),
          // 合集管理：具备管理权限，或为某个合集的协作者（只能看到被指派的合集）
          meta: { title: '合集管理', requiresAuth: true, requires: 'collect' }
        },
        {
          path: 'share',
          name: 'adminShare',
          component: () => import('../views/admin/ShareManageView.vue'),
          meta: { title: '分享管理', requiresAuth: true, requires: 'manage' }
        },
        {
          path: 'users',
          name: 'adminUsers',
          component: () => import('../views/admin/UserManageView.vue'),
          meta: { title: '用户管理', requiresAuth: true, requires: 'admin' }
        }
      ]
    },

    // 404 兜底
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
})

// ===== 路由守卫 =====

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()

  // 需要登录的后台页面
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    next({ name: 'adminLogin', query: { redirect: to.fullPath } })
    return
  }

  // 令牌可能已在服务端过期/被吊销：进入后台前主动校验一次（60 秒内复用结果）
  if (to.meta.requiresAuth) {
    const valid = await authStore.verifySession()
    if (!valid) {
      next({ name: 'adminLogin', query: { redirect: to.fullPath } })
      return
    }
  }

  // 按页面所需能力校验，与后端权限标记保持同一口径
  const abilityCheck = {
    upload: () => authStore.isAdmin || authStore.canUpload,
    manage: () => authStore.isAdmin || authStore.canManage,
    collect: () => authStore.isAdmin || authStore.canManage || authStore.isCollectionMember,
    admin: () => authStore.isAdmin
  }
  const required = to.meta.requires
  if (required && abilityCheck[required] && !abilityCheck[required]()) {
    next({ name: 'dashboard' })
    return
  }

  // 已登录用户访问登录页，跳转到后台首页
  if (to.meta.requiresGuest && authStore.isLoggedIn) {
    next({ name: 'dashboard' })
    return
  }

  // 设置页面标题
  document.title = to.meta.title
    ? `${to.meta.title} - 摄影相册`
    : '摄影相册 - Photo Album'

  next()
})

export default router
