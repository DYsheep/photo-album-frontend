/* 摄影相册 PWA：应用壳缓存 + 静态资源运行时缓存
   原则：① 接口（/api/）绝不缓存，避免看到过期数据 ② 跨域（COS 图片）不拦截
        ③ 导航请求网络优先，离线时回退到上次的 index.html */
const VERSION = 'v1'
const SHELL = `dyframe-shell-${VERSION}`
const RUNTIME = `dyframe-runtime-${VERSION}`
const SHELL_ASSETS = ['/', '/index.html', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return      // COS 图片等跨域请求交给浏览器
  if (url.pathname.startsWith('/api/')) return         // 接口一律走网络

  // 页面导航：网络优先，失败时用缓存的应用壳
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request)
        const cache = await caches.open(SHELL)
        cache.put('/index.html', fresh.clone())
        return fresh
      } catch {
        const cache = await caches.open(SHELL)
        const cached = await cache.match('/index.html')
        return cached || Response.error()
      }
    })())
    return
  }

  // 静态资源：缓存优先（Vite 产物文件名带哈希，可长期复用）
  event.respondWith((async () => {
    const cache = await caches.open(RUNTIME)
    const hit = await cache.match(request)
    if (hit) return hit
    const fresh = await fetch(request)
    if (fresh.ok) cache.put(request, fresh.clone())
    return fresh
  })())
})
