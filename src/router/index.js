import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

// 前台页面
import HomeView from '../views/HomeView.vue'
import AboutView from '../views/AboutView.vue'
import PhotoDetailView from '../views/PhotoDetailView.vue'
import CollectionListView from '../views/CollectionListView.vue'
import CollectionDetailView from '../views/CollectionDetailView.vue'
import MapView from '../views/MapView.vue'

// 管理后台页面
import LoginView from '../views/admin/LoginView.vue'
import AdminLayout from '../views/admin/AdminLayout.vue'
import DashboardView from '../views/admin/DashboardView.vue'
import UploadView from '../views/admin/UploadView.vue'
import PhotoManageView from '../views/admin/PhotoManageView.vue'
import CategoryView from '../views/admin/CategoryView.vue'
import TagManageView from '../views/admin/TagManageView.vue'
import CollectionManageView from '../views/admin/CollectionManageView.vue'
import ShareManageView from '../views/admin/ShareManageView.vue'
import UserManageView from '../views/admin/UserManageView.vue'

// 公开分享页面
import ShareView from '../views/ShareView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // ===== 前台路由 =====
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/about',
      name: 'about',
      component: AboutView
    },
    {
      path: '/photo/:id',
      name: 'photoDetail',
      component: PhotoDetailView
    },
    {
      path: '/collections',
      name: 'collections',
      component: CollectionListView
    },
    {
      path: '/collections/:id',
      name: 'collectionDetail',
      component: CollectionDetailView
    },
    {
      path: '/map',
      name: 'map',
      component: MapView
    },
    {
      path: '/share/:code',
      name: 'shareView',
      component: ShareView
    },

    // ===== 管理员路由 =====
    // requires 取值与后端权限标记一一对应：
    //   upload → photo:upload（管理员或 canUpload）
    //   manage → photo:manage（管理员或 canManage）
    //   admin  → user:manage（仅管理员）
    {
      path: '/admin/login',
      name: 'adminLogin',
      component: LoginView,
      meta: { requiresGuest: true }
    },
    {
      path: '/admin',
      component: AdminLayout,
      meta: { requiresAuth: true },
      redirect: '/admin/dashboard',
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: DashboardView,
          meta: { title: '数据概览' }
        },
        {
          path: 'upload',
          name: 'upload',
          component: UploadView,
          meta: { title: '上传图片', requiresAuth: true, requires: 'upload' }
        },
        {
          path: 'photos',
          name: 'photos',
          component: PhotoManageView,
          meta: { title: '照片管理', requiresAuth: true, requires: 'manage' }
        },
        {
          path: 'categories',
          name: 'categories',
          component: CategoryView,
          meta: { title: '分类管理', requiresAuth: true, requires: 'manage' }
        },
        {
          path: 'tags',
          name: 'tags',
          component: TagManageView,
          meta: { title: '标签管理', requiresAuth: true, requires: 'manage' }
        },
        {
          path: 'collections',
          name: 'adminCollections',
          component: CollectionManageView,
          meta: { title: '合集管理', requiresAuth: true, requires: 'manage' }
        },
        {
          path: 'share',
          name: 'adminShare',
          component: ShareManageView,
          meta: { title: '分享管理', requiresAuth: true, requires: 'manage' }
        },
        {
          path: 'users',
          name: 'adminUsers',
          component: UserManageView,
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

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  // 需要登录的后台页面
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    next({ name: 'adminLogin' })
    return
  }

  // 按页面所需能力校验，与后端权限标记保持同一口径
  const abilityCheck = {
    upload: () => authStore.isAdmin || authStore.canUpload,
    manage: () => authStore.isAdmin || authStore.canManage,
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
