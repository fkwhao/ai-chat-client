<template>
  <aside class="h-full w-full bg-[#f3f3f5] dark:bg-[#2b2b2b] flex flex-col relative transition-colors duration-500 font-sans">

    <!-- Drag region -->
    <div class="drag-region h-[6px] shrink-0"></div>

    <!-- ═══════ Chat Mode ═══════ -->
    <template v-if="currentView === 'chat'">
      <!-- Top bar: drag region + collapse button -->
      <div class="flex items-center justify-between px-4 pt-2 pb-1 no-drag">
        <span class="text-[11px] font-semibold text-gray-400 dark:text-[#555] tracking-wide">对话历史</span>
        <button @click="emit('toggle-sidebar')"
                class="p-1 rounded-lg hover:bg-white/80 dark:hover:bg-[#333333] transition-all text-gray-400 dark:text-[#555]">
          <PanelLeft :size="15"/>
        </button>
      </div>

      <div class="px-4 pt-2 pb-3 space-y-1.5 no-drag">
        <button @click="createNewSession" class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98] transition-all duration-150">
          <Plus :size="15" stroke-width="2.5" class="text-gray-500 dark:text-[#999]"/>
          <span class="text-[13px] font-medium text-gray-600 dark:text-[#ccc]">新对话</span>
        </button>

        <button @click="showSearch = true" class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-150">
          <Search :size="14" class="text-gray-400 dark:text-[#555]"/>
          <span class="text-[13px] text-gray-400 dark:text-[#555]">搜索...</span>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto px-2 space-y-0.5 custom-scrollbar pb-6" @scroll="handleScroll">
        <div v-for="(group, groupName) in groupedHistory" :key="groupName" class="space-y-0.5">
          <div v-if="group.length > 0"
               class="sticky top-0 z-20 px-3 pt-1.5 pb-1 bg-[#f3f3f5]/95 dark:bg-[#2b2b2b]/95 backdrop-blur-md">
            <span class="text-[10px] font-bold text-gray-400 dark:text-[#555] uppercase tracking-widest">{{ groupName }}</span>
          </div>
          <div v-for="item in group" :key="item.id"
               @click="selectSession(item.id)"
               :class="route.query.session === item.id
                  ? 'bg-black/5 dark:bg-white/8'
                  : 'hover:bg-black/5 dark:hover:bg-white/5'"
               class="group/item flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer transition-all duration-150">
            <div class="flex items-center gap-2.5 overflow-hidden pl-0.5">
              <div class="w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-300"
                   :class="route.query.session === item.id ? 'bg-gray-500 dark:bg-[#999]' : 'bg-transparent group-hover/item:bg-gray-300 dark:group-hover/item:bg-[#666]'"></div>
              <span class="truncate text-[13px] transition-colors duration-200"
                    :class="route.query.session === item.id ? 'font-semibold text-gray-800 dark:text-[#eee]' : 'text-gray-500 dark:text-[#888] group-hover/item:text-gray-700 dark:group-hover/item:text-[#ccc]'">
                {{ item.title }}
              </span>
            </div>
            <button @click.stop="deleteTarget = item"
                    class="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400 rounded-lg transition-all text-gray-300 dark:text-[#555] active:scale-90">
              <Trash2 :size="13"/>
            </button>
          </div>
        </div>
        <div v-if="historyData.length === 0 && !isLoading"
             class="text-center py-12 text-gray-400 dark:text-[#555] text-[13px] flex flex-col items-center gap-2">
          <MessageSquare :size="24" stroke-width="1.5" class="opacity-40 mb-1"/>
          <span class="tracking-wide">暂无对话记录</span>
        </div>
        <div v-if="isLoading" class="text-center py-4 text-gray-400 dark:text-[#555] text-[12px] animate-pulse">
          加载中...
        </div>
      </div>

      <!-- Bottom: Settings button -->
      <div class="p-3 bg-[#f3f3f5]/80 dark:bg-[#2b2b2b]/80 backdrop-blur-sm border-t border-gray-200/40 dark:border-white/5 shrink-0">
        <div class="relative">
          <button @click="isSettingsOpen = !isSettingsOpen"
                  class="flex items-center gap-3 p-2.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all text-gray-500 dark:text-[#777] hover:text-gray-800 dark:hover:text-[#ccc] group active:scale-[0.98] w-full">
            <Settings :size="16" class="transition-transform duration-500 group-hover:rotate-45"/>
            <span class="text-[13px] font-semibold">设置</span>
          </button>

          <!-- Settings Popover -->
          <Transition name="popover">
            <div v-if="isSettingsOpen"
                 class="absolute bottom-full left-0 right-0 mb-2 bg-[#f3f3f5] dark:bg-[#2b2b2b] border border-gray-200 dark:border-white/8 rounded-2xl shadow-xl overflow-hidden z-50 py-1.5">
              <button @click="openSettings('api-settings')"
                      class="w-full flex items-center gap-3 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[13px] text-gray-700 dark:text-[#e0e0e0] font-medium">
                <Settings2 :size="15" class="text-gray-400"/>
                API 设置
              </button>
              <button @click="openSettings('token-stats')"
                      class="w-full flex items-center gap-3 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[13px] text-gray-700 dark:text-[#e0e0e0] font-medium">
                <BarChart3 :size="15" class="text-gray-400"/>
                使用统计
              </button>
              <div class="my-1.5 border-t border-gray-200 dark:border-white/8"></div>
              <button @click="emit('toggle-theme'); isSettingsOpen = false"
                      class="w-full flex items-center justify-between px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[13px] text-gray-700 dark:text-[#e0e0e0] font-medium">
                <span class="flex items-center gap-3">
                  <Moon v-if="!isDarkMode" :size="15" class="text-gray-400"/>
                  <Sun v-else :size="15" class="text-gray-400"/>
                  深色模式
                </span>
                <div :class="isDarkMode ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-[#555]'"
                     class="w-9 h-5 rounded-full relative transition-colors">
                  <div :class="isDarkMode ? 'translate-x-4' : 'translate-x-0.5'"
                       class="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"></div>
                </div>
              </button>
            </div>
          </Transition>
        </div>
      </div>
    </template>

    <!-- ═══════ Settings Mode ═══════ -->
    <template v-else>
      <div class="px-4 pt-3 pb-4 no-drag">
        <button @click="emit('navigate', 'chat')"
                class="flex items-center gap-2.5 text-gray-500 dark:text-[#888] hover:text-gray-900 dark:hover:text-[#e0e0e0] transition-colors group py-2">
          <ArrowLeft :size="18" class="group-hover:-translate-x-1 transition-transform"/>
          <span class="text-[14px] font-semibold">返回对话</span>
        </button>
      </div>

      <div class="flex-1 px-3 space-y-1">
        <button @click="emit('navigate', 'api-settings')"
                :class="currentView === 'api-settings'
                  ? 'bg-black/5 dark:bg-white/8 text-gray-800 dark:text-[#eee]'
                  : 'text-gray-500 dark:text-[#888] hover:bg-black/5 dark:hover:bg-white/5'"
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-[13px] font-medium">
          <Settings2 :size="16"/>
          API 设置
        </button>
        <button @click="emit('navigate', 'token-stats')"
                :class="currentView === 'token-stats'
                  ? 'bg-black/5 dark:bg-white/8 text-gray-800 dark:text-[#eee]'
                  : 'text-gray-500 dark:text-[#888] hover:bg-black/5 dark:hover:bg-white/5'"
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-[13px] font-medium">
          <BarChart3 :size="16"/>
          使用统计
        </button>
      </div>
    </template>

    <!-- Delete Confirmation Overlay -->
    <Transition name="popover">
      <div v-if="deleteTarget" class="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm" @click="cancelDelete">
        <div class="bg-[#f3f3f5] dark:bg-[#2b2b2b] rounded-2xl shadow-xl mx-4 p-5 w-full max-w-[260px] text-center border border-gray-200 dark:border-white/8" @click.stop>
          <p class="text-[13px] text-gray-700 dark:text-[#ccc] mb-1 font-medium">确定要删除这个对话吗？</p>
          <p class="text-[12px] text-gray-400 dark:text-[#666] mb-4 truncate">"{{ deleteTarget.title }}"</p>
          <div class="flex gap-2 justify-center">
            <button @click="cancelDelete"
                    class="px-5 py-2 text-[12px] font-medium rounded-lg bg-black/5 dark:bg-white/5 text-gray-600 dark:text-[#999] hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
              取消
            </button>
            <button @click="confirmDelete"
                    class="px-5 py-2 text-[12px] font-medium rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors">
              删除
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Search Modal -->
    <Transition name="popover">
      <div v-if="showSearch" class="fixed inset-0 z-[150] flex justify-center pt-[12vh] bg-black/40 backdrop-blur-sm" @click="showSearch = false">
        <div class="bg-[#f3f3f5] dark:bg-[#2b2b2b] rounded-2xl shadow-2xl w-[480px] max-w-[90vw] max-h-[65vh] flex flex-col border border-gray-200 dark:border-white/8" @click.stop>
          <div class="p-4 border-b border-gray-200 dark:border-white/8">
            <div class="relative">
              <Search :size="15" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#555]"/>
              <input v-model="searchQuery" type="text" placeholder="搜索对话..."
                     @input="doSearch"
                     class="w-full bg-transparent border-none outline-none pl-9 pr-3 py-2 text-[14px] text-gray-800 dark:text-[#e0e0e0] placeholder-gray-400 dark:placeholder-[#555]"/>
            </div>
          </div>
          <div class="flex-1 overflow-y-auto p-2 custom-scrollbar">
            <div v-if="searchLoading" class="text-center py-8 text-gray-400 dark:text-[#555] text-[13px] animate-pulse">
              搜索中...
            </div>
            <div v-else-if="searchResults.length === 0 && searchQuery" class="text-center py-8 text-gray-400 dark:text-[#555] text-[13px]">
              未找到相关对话
            </div>
            <div v-else-if="searchResults.length === 0 && !searchQuery" class="text-center py-8 text-gray-400 dark:text-[#555] text-[13px]">
              输入关键词搜索对话
            </div>
            <button v-for="item in searchResults" :key="item.id"
                    @click="selectSearchResult(item.id)"
                    class="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-150 text-left">
              <MessageSquare :size="13" class="text-gray-400 dark:text-[#555] shrink-0"/>
              <span class="truncate text-[13px] text-gray-700 dark:text-[#ccc]">{{ item.title }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>

  </aside>
</template>

<script setup>
import {ref, computed, onMounted, onUnmounted} from 'vue'
import {useRouter, useRoute} from 'vue-router'
import {Plus, MessageSquare, Settings, Search, Trash2, BarChart3, Settings2, Moon, Sun, ArrowLeft, PanelLeft} from 'lucide-vue-next'

const props = defineProps({
  currentView: { type: String, default: 'chat' },
  isDarkMode: { type: Boolean, default: false }
})

const emit = defineEmits(['navigate', 'toggle-theme', 'toggle-sidebar'])

const router = useRouter()
const route = useRoute()

const searchQuery = ref('')
const showSearch = ref(false)
const searchResults = ref([])
const searchLoading = ref(false)
const historyData = ref([])
const currentPage = ref(1)
const hasMore = ref(true)
const isLoading = ref(false)
const isSettingsOpen = ref(false)
const deleteTarget = ref(null)

const API_BASE = '/api/v1/history'

const fetchSessions = async (isReset = false) => {
  if (isLoading.value) return
  if (isReset) {
    currentPage.value = 1
    hasMore.value = true
    historyData.value = []
  }
  if (!hasMore.value) return

  isLoading.value = true
  try {
    const res = await fetch(`${API_BASE}/sessions/page?keyword=&current=${currentPage.value}&size=15`)
    if (res.ok) {
      const data = await res.json()
      const records = data.records || []
      if (records.length < 15) hasMore.value = false
      historyData.value.push(...records)
      currentPage.value++
    }
  } catch (error) {
    console.error('获取历史记录失败:', error)
  } finally {
    isLoading.value = false
  }
}

const handleScroll = (e) => {
  const {scrollTop, clientHeight, scrollHeight} = e.target
  if (scrollHeight - scrollTop - clientHeight < 50) fetchSessions(false)
}

let searchTimeout = null
const doSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    if (!searchQuery.value.trim()) {
      searchResults.value = []
      return
    }
    searchLoading.value = true
    try {
      const res = await fetch(`${API_BASE}/sessions/page?keyword=${encodeURIComponent(searchQuery.value)}&current=1&size=50`)
      if (res.ok) {
        const data = await res.json()
        searchResults.value = data.records || []
      }
    } catch (e) {
      searchResults.value = []
    } finally {
      searchLoading.value = false
    }
  }, 300)
}

const selectSearchResult = (id) => {
  showSearch.value = false
  searchQuery.value = ''
  searchResults.value = []
  router.push(`/?session=${id}`)
}

const groupedHistory = computed(() => {
  const groups = {'今天': [], '昨天': [], '更早': []}
  const today = new Date().setHours(0, 0, 0, 0)
  const yesterday = today - 86400000

  historyData.value.forEach(item => {
    const t = new Date(item.updateTime).getTime()
    if (t >= today) groups['今天'].push(item)
    else if (t >= yesterday) groups['昨天'].push(item)
    else groups['更早'].push(item)
  })
  return groups
})

const createNewSession = async () => {
  try {
    const res = await fetch(`${API_BASE}/session`, {method: 'POST'})
    if (res.ok) {
      const session = await res.json()
      fetchSessions(true)
      router.push(`/?session=${session.id}`)
    }
  } catch (error) {
    console.error('创建会话失败:', error)
  }
}

const selectSession = (id) => {
  router.push(`/?session=${id}`)
}

const deleteSession = async (id) => {
  try {
    await fetch(`${API_BASE}/session/${id}`, {method: 'DELETE'})
    fetchSessions(true)
    if (route.query.session === id) router.push('/')
    deleteTarget.value = null
  } catch (error) {
    console.error('删除会话失败:', error)
  }
}

const confirmDelete = () => {
  if (deleteTarget.value) deleteSession(deleteTarget.value.id)
}

const cancelDelete = () => {
  deleteTarget.value = null
}

const openSettings = (view) => {
  isSettingsOpen.value = false
  emit('navigate', view)
}

// Close popover when clicking outside
const closePopover = (e) => {
  if (isSettingsOpen.value && !e.target.closest('.relative')) {
    isSettingsOpen.value = false
  }
}

onMounted(() => {
  fetchSessions(true)
  window.addEventListener('refresh-sessions', () => fetchSessions(true))
  document.addEventListener('click', closePopover)
})

onUnmounted(() => {
  window.removeEventListener('refresh-sessions', () => fetchSessions(true))
  document.removeEventListener('click', closePopover)
})
</script>

<style scoped>
.popover-enter-active, .popover-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.popover-enter-from, .popover-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.96);
}
</style>
