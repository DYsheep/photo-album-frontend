import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getPhotoListApi } from '../api/photo'
import { getCategoryListApi } from '../api/category'
import { getTagListApi } from '../api/tag'

export const useAlbumStore = defineStore('album', () => {
  // 相册数据状态
  const photos = ref([])
  const categories = ref(['全部'])
  const activeCategory = ref('全部')
  const activeTag = ref('')
  const searchKeyword = ref('')
  const tags = ref([])
  const isLoading = ref(false)

  // 计算属性：按分类 + 标签 + 搜索筛选照片
  const filteredPhotos = computed(() => {
    let result = photos.value

    // 分类筛选
    if (activeCategory.value !== '全部') {
      result = result.filter(p => p.categoryName === activeCategory.value)
    }

    // 标签筛选（与分类互斥，但这里以标签优先）
    if (activeTag.value) {
      result = result.filter(p => {
        if (!p.tags) return false
        const tagArr = p.tags.split(',').map(t => t.trim())
        return tagArr.includes(activeTag.value)
      })
    }

    // 搜索关键词
    if (searchKeyword.value) {
      const kw = searchKeyword.value.toLowerCase()
      result = result.filter(p => {
        const title = (p.title || '').toLowerCase()
        const desc = (p.description || '').toLowerCase()
        const tagStr = (p.tags || '').toLowerCase()
        return title.includes(kw) || desc.includes(kw) || tagStr.includes(kw)
      })
    }

    return result
  })

  // 设置当前分类（清除标签和搜索）
  function setCategory(category) {
    activeCategory.value = category
    activeTag.value = ''
    searchKeyword.value = ''
  }

  // 设置标签筛选（切换：再次点击取消，选中时清除分类和搜索）
  function setTag(tag) {
    if (activeTag.value === tag) {
      activeTag.value = ''
    } else {
      activeTag.value = tag
      activeCategory.value = '全部'
      searchKeyword.value = ''
    }
  }

  // 搜索（设置关键词，清除分类和标签）
  function searchPhotos(keyword) {
    searchKeyword.value = keyword
    activeCategory.value = '全部'
    activeTag.value = ''
  }

  // 清除所有筛选
  function clearFilters() {
    activeCategory.value = '全部'
    activeTag.value = ''
    searchKeyword.value = ''
  }

  // 加载标签列表
  async function loadTags() {
    try {
      const res = await getTagListApi()
      if (res.code === 200 && res.data) {
        tags.value = res.data
      }
    } catch (err) {
      console.error('加载标签失败:', err)
      tags.value = []
    }
  }

  // 加载分类列表
  async function loadCategories() {
    try {
      const res = await getCategoryListApi()
      const categoryNames = (res.data || []).map(c => c.name)
      categories.value = ['全部', ...categoryNames]
    } catch (err) {
      console.error('加载分类失败:', err)
    }
  }

  // 加载照片（对接后端 API，支持 keyword 搜索）
  async function loadPhotos(keyword) {
    isLoading.value = true
    try {
      const params = { pageSize: 100 }
      if (keyword) {
        params.keyword = keyword
      }
      const res = await getPhotoListApi(params)
      const list = res.data?.list || []
      photos.value = list.map(p => ({
        id: p.id,
        title: p.title,
        description: p.description,
        categoryId: p.categoryId,
        categoryName: p.categoryName || '',
        url: p.url,
        tags: p.tags,
        viewCount: p.viewCount,
        fileSize: p.fileSize,
        fileName: p.fileName,
        exifInfo: p.exifInfo,
        cameraModel: p.cameraModel || '',
        aperture: p.aperture || '',
        shutterSpeed: p.shutterSpeed || '',
        iso: p.iso || '',
        focalLength: p.focalLength || '',
        dateTaken: p.dateTaken || ''
      }))
    } catch (err) {
      console.error('加载照片失败:', err)
      photos.value = []
    } finally {
      isLoading.value = false
    }
  }

  return {
    photos,
    categories,
    activeCategory,
    activeTag,
    searchKeyword,
    tags,
    isLoading,
    filteredPhotos,
    setCategory,
    setTag,
    searchPhotos,
    clearFilters,
    loadPhotos,
    loadCategories,
    loadTags
  }
})
