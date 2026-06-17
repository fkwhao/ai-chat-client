<template>
  <aside class="h-full w-full bg-[#f7f7f8] dark:bg-[#1c1c1c] flex flex-col relative transition-colors duration-500 font-sans">

    <!-- Drag region -->
    <div class="drag-region h-[6px] shrink-0"></div>

    <!-- ═══════ Chat Mode ═══════ -->
    <template v-if="currentView === 'chat'">
      <!-- Top bar: drag region + collapse button -->
      <div class="flex items-center justify-between px-4 pt-2 pb-1 no-drag">
        <span class="text-[11px] font-semibold text-gray-400 dark:text-[#555] tracking-wide">对话历史</span>
        <button @click="emit('toggle-sidebar')"
                class="p-1 rounded-lg hover:bg-white/80 dark:hover:bg-[#1e1e1e] transition-all text-gray-400 dark:text-[#555]">
          <PanelLeft :size="15"/>
        </button>
      </div>

      <div class="px-4 pt-2 pb-4 space-y-3 no-drag">
        <button @click="createNewSession" class="w-full flex items-center gap-2.5 px-3 py-2.5 bg-white dark:bg-[#242424] border border-gray-200/60 dark:border-white/8 rounded-xl hover:border-gray-300 dark:hover:border-white/12 dark:hover:bg-[#2a2a2a] active:scale-[0.98] transition-all duration-200">
          <Plus :size="15" stroke-width="2.5" class="text-gray-500 dark:text-[#999]"/>
          <span class="text-[13px] font-medium text-gray-600 dark:text-[#ccc]">新对话</span>
        </button>

        <div class="relative">
          <Search :size="14" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#555]"/>
          <input v-model="searchQuery" type="text" placeholder="搜索..."
                 class="w-full bg-white dark:bg-[#242424] border border-gray-200/60 dark:border-white/8 rounded-xl pl-9 pr-3 py-2.5 text-[13px] text-gray-700 dark:text-[#ccc] placeholder-gray-400 dark:placeholder-[#555] outline-none focus:border-gray-300 dark:focus:border-white/15 transition-all duration-200"/>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-2 space-y-2 custom-scrollbar pb-6" @scroll="handleScroll">
        <div v-for="(group, groupName) in groupedHistory" :key="groupName" class="space-y-0.5">
          <div v-if="group.length > 0"
               class="sticky top-0 z-20 px-3 pt-1.5 pb-1 bg-[#f7f7f8]/95 dark:bg-[#1c1c1c]/95 backdrop-blur-md">
            <span class="text-[10px] font-bold text-gray-400 dark:text-[#555] uppercase tracking-widest">{{ groupName }}</span>
          </div>
          <div v-for="item in group" :key="item.id"
               @click="selectSession(item.id)"
               :class="route.query.session === item.id
                  ? 'bg-white dark:bg-[#242424] shadow-sm border border-gray-300 dark:border-white/10'
                  : 'border border-transparent hover:bg-white/60 dark:hover:bg-[#1a1a1a]/60'"
               class="group/item flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all duration-200">
            <div class="flex items-center gap-3 overflow-hidden pl-1">
              <div class="w-2 h-2 rounded-full shrink-0 transition-all duration-300"
                   :class="route.query.session === item.id ? 'bg-gray-700 dark:bg-[#888] shadow-sm' : 'bg-transparent group-hover/item:bg-gray-300 dark:group-hover/item:bg-[#444]'"></div>
              <span class="truncate text-[13px] transition-colors duration-200"
                    :class="route.query.session === item.id ? 'font-semibold text-gray-800 dark:text-[#eee]' : 'text-gray-500 dark:text-[#888] group-hover/item:text-gray-700 dark:group-hover/item:text-[#ccc]'">
                {{ item.title }}
              </span>
            </div>
            <button @click.stop="deleteTarget = item"
                    class="opacity-0 group-hover/item:opacity-100 p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400 rounded-lg transition-all text-gray-300 dark:text-[#555] active:scale-90">
              <Trash2 :size="14"/>
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
      <div class="p-4 bg-[#f7f7f8]/80 dark:bg-[#1c1c1c]/80 backdrop-blur-sm border-t border-gray-200/40 dark:border-white/5 shrink-0">
        <div class="relative">
          <button @click="isSettingsOpen = !isSettingsOpen"
                  class="flex items-center gap-3 p-3 rounded-xl hover:bg-white/80 dark:hover:bg-[#1a1a1a] transition-all text-gray-500 dark:text-[#777] hover:text-gray-800 dark:hover:text-[#ccc] group active:scale-[0.98] w-full">
            <Settings :size="16" class="transition-transform duration-500 group-hover:rotate-45"/>
            <span class="text-[13px] font-semibold">设置</span>
          </button>

          <!-- Settings Popover -->
          <Transition name="popover">
            <div v-if="isSettingsOpen"
                 class="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-[#242424] border border-gray-200 dark:border-white/8 rounded-2xl shadow-xl overflow-hidden z-50 py-1.5">
              <button @click="openSettings('api-settings')"
                      class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors text-[13px] text-gray-700 dark:text-[#e0e0e0] font-medium">
                <Settings2 :size="15" class="text-gray-400"/>
                API 设置
              </button>
              <button @click="openSettings('token-stats')"
                      class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors text-[13px] text-gray-700 dark:text-[#e0e0e0] font-medium">
                <BarChart3 :size="15" class="text-gray-400"/>
                Token 统计
              </button>
              <div class="my-1.5 border-t border-gray-100 dark:border-white/8"></div>
              <button @click="emit('toggle-theme'); isSettingsOpen = false"
                      class="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors text-[13px] text-gray-700 dark:text-[#e0e0e0] font-medium">
                <span class="flex items-center gap-3">
                  <Moon v-if="!isDarkMode" :size="15" class="text-gray-400"/>
                  <Sun v-else :size="15" class="text-gray-400"/>
                  深色模式
                </span>
                <div :class="isDarkMode ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-[#333]'"
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
                  ? 'bg-white dark:bg-[#242424] shadow-sm border border-gray-300 dark:border-white/10 text-gray-800 dark:text-[#eee]'
                  : 'border border-transparent text-gray-500 dark:text-[#888] hover:bg-white/60 dark:hover:bg-[#1a1a1a]/60'"
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-[13px] font-medium">
          <Settings2 :size="16"/>
          API 设置
        </button>
        <button @click="emit('navigate', 'token-stats')"
                :class="currentView === 'token-stats'
                  ? 'bg-white dark:bg-[#242424] shadow-sm border border-gray-300 dark:border-white/10 text-gray-800 dark:text-[#eee]'
                  : 'border border-transparent text-gray-500 dark:text-[#888] hover:bg-white/60 dark:hover:bg-[#1a1a1a]/60'"
                class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-[13px] font-medium">
          <BarChart3 :size="16"/>
          Token 统计
        </button>
      </div>
    </template>

    <!-- Delete Confirmation Overlay -->
    <Transition name="popover">
      <div v-if="deleteTarget" class="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm" @click="cancelDelete">
        <div class="bg-white dark:bg-[#242424] rounded-2xl shadow-xl mx-4 p-5 w-full max-w-[260px] text-center border border-gray-200 dark:border-white/8" @click.stop>
          <p class="text-[13px] text-gray-700 dark:text-[#ccc] mb-1 font-medium">确定要删除这个对话吗？</p>
          <p class="text-[12px] text-gray-400 dark:text-[#666] mb-4 truncate">"{{ deleteTarget.title }}"</p>
          <div class="flex gap-2 justify-center">
            <button @click="cancelDelete"
                    class="px-5 py-2 text-[12px] font-medium rounded-lg bg-gray-100 dark:bg-[#1c1c1c] text-gray-600 dark:text-[#999] hover:bg-gray-200 dark:hover:bg-[#2a2a2a] transition-colors">
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

  </aside>
</template>

<script setup>
import {ref, computed, onMounted, onUnmounted, watch} from 'vue'
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
const historyData = ref([])
const currentPage = ref(1)
const hasMore = ref(true)
const isLoading = ref(false)
const isSettingsOpen = ref(false)
const deleteTarget = ref(null) // 待删除的会话 { id, title }

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
    const res = await fetch(`${API_BASE}/sessions/page?keyword=${encodeURIComponent(searchQuery.value)}&current=${currentPage.value}&size=15`)
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
watch(searchQuery, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => fetchSessions(true), 400)
})

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
