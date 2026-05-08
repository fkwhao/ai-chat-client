<template>
  <aside class="h-full w-full bg-gradient-to-b from-[#fafafa] to-[#f5f5f5] dark:from-[#171717] dark:to-[#141414] flex flex-col relative transition-colors duration-500 border-r border-gray-200/40 dark:border-white/5 font-sans">

    <div class="px-4 pt-6 pb-4 space-y-4">
      <button @click="createNewSession" class="w-full group relative flex items-center justify-between px-4 py-3 bg-white dark:bg-[#252525] border border-gray-200/60 dark:border-[#3a3a3a] rounded-xl shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-[#4a4a4a] dark:hover:bg-[#2a2a2a] active:scale-[0.98] transition-all duration-300 overflow-hidden">
        <div class="flex items-center gap-2.5 z-10">
          <div class="bg-gray-700 dark:bg-[#444] text-white p-1.5 rounded-lg group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
            <Plus :size="14" stroke-width="2.5" />
          </div>
          <span class="text-[14px] font-semibold text-gray-700 dark:text-[#d8d8d8] group-hover:text-gray-900 dark:hover:text-white transition-colors">新对话</span>
        </div>
        <SquarePen :size="15" class="text-gray-300 dark:text-[#555] group-hover:text-gray-400 dark:group-hover:text-[#777] transition-colors group-hover:translate-x-0.5" />
      </button>

      <div class="relative group">
        <Search :size="15"
                class="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#666] group-focus-within:text-gray-600 dark:group-focus-within:text-[#888] transition-colors duration-300"/>
        <input v-model="searchQuery" type="text" placeholder="搜索历史..."
               class="w-full bg-white dark:bg-[#222222] border-2 border-transparent focus:bg-white dark:focus:bg-[#1a1a1a] focus:border-gray-300 dark:focus:border-[#444] rounded-xl pl-10 pr-4 py-2.5 text-[13px] text-gray-700 dark:text-[#e0e0e0] placeholder-gray-400 dark:placeholder-[#666] outline-none transition-all duration-300 shadow-sm focus:shadow-md"/>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto px-2 space-y-4 custom-scrollbar pb-6" @scroll="handleScroll">
      <div v-for="(group, groupName) in groupedHistory" :key="groupName" class="space-y-1">

        <div v-if="group.length > 0"
             class="sticky top-0 z-20 px-3 pt-2 pb-1.5 bg-[#fafafa]/95 dark:bg-[#171717]/95 backdrop-blur-md">
          <span class="text-[10px] font-bold text-gray-400 dark:text-[#666] uppercase tracking-widest">{{ groupName }}</span>
        </div>

        <div v-for="item in group" :key="item.id"
             @click="selectSession(item.id)"
             :class="route.query.session === item.id
                ? 'bg-white dark:bg-[#252525] shadow-sm border border-gray-300 dark:border-[#444]'
                : 'border border-transparent hover:bg-white/60 dark:hover:bg-[#222]/60'"
             class="group/item flex items-center justify-between mx-1 p-2.5 rounded-xl cursor-pointer transition-all duration-200">

          <div class="flex items-center gap-3 overflow-hidden pl-1">
            <div class="w-2 h-2 rounded-full shrink-0 transition-all duration-300"
                 :class="route.query.session === item.id ? 'bg-gray-700 dark:bg-[#aaa] shadow-sm' : 'bg-transparent group-hover/item:bg-gray-300 dark:group-hover/item:bg-[#444]'"></div>
            <span class="truncate text-[13px] transition-colors duration-200"
                  :class="route.query.session === item.id ? 'font-semibold text-gray-800 dark:text-[#eee]' : 'text-gray-500 dark:text-[#999] group-hover/item:text-gray-700 dark:group-hover/item:text-[#bbb]'">
              {{ item.title }}
            </span>
          </div>

          <button @click.stop="deleteSession(item.id)"
                  class="opacity-0 group-hover/item:opacity-100 p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400 rounded-lg transition-all text-gray-300 dark:text-[#555] active:scale-90">
            <Trash2 :size="14"/>
          </button>
        </div>
      </div>

      <div v-if="historyData.length === 0 && !isLoading"
           class="text-center py-12 text-gray-400 dark:text-[#666] text-[13px] flex flex-col items-center gap-2">
        <MessageSquare :size="24" stroke-width="1.5" class="opacity-40 mb-1"/>
        <span class="tracking-wide">暂无对话记录</span>
      </div>
      <div v-if="isLoading" class="text-center py-4 text-gray-400 dark:text-[#666] text-[12px] animate-pulse">
        加载中...
      </div>
    </div>

    <div class="p-4 bg-[#fafafa]/80 dark:bg-[#171717]/80 backdrop-blur-sm border-t border-gray-200/40 dark:border-white/5 shrink-0 space-y-1">
      <router-link to="/token-stats" @click="emit('close')"
                   class="flex items-center gap-3 p-3 rounded-xl hover:bg-white/80 dark:hover:bg-[#252525] transition-all text-gray-500 dark:text-[#888] hover:text-gray-800 dark:hover:text-[#ccc] group active:scale-[0.98]">
        <BarChart3 :size="16" class="transition-transform duration-300 group-hover:scale-110"/>
        <span class="text-[13px] font-semibold">Token 统计</span>
      </router-link>
      <router-link to="/settings" @click="emit('close')"
                   class="flex items-center gap-3 p-3 rounded-xl hover:bg-white/80 dark:hover:bg-[#252525] transition-all text-gray-500 dark:text-[#888] hover:text-gray-800 dark:hover:text-[#ccc] group active:scale-[0.98]">
        <Settings :size="16" class="transition-transform duration-500 group-hover:rotate-45"/>
        <span class="text-[13px] font-semibold">设置</span>
      </router-link>
    </div>
  </aside>
</template>

<script setup>
import {ref, computed, onMounted, onUnmounted, watch} from 'vue'
import {useRouter, useRoute} from 'vue-router'
import {Plus, MessageSquare, Settings, Search, Trash2, SquarePen, BarChart3} from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()

const emit = defineEmits(['close'])

const searchQuery = ref('')
const historyData = ref([])
const currentPage = ref(1)
const hasMore = ref(true)
const isLoading = ref(false)

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
      emit('close')
    }
  } catch (error) {
    console.error('创建会话失败:', error)
  }
}

const selectSession = (id) => {
  router.push(`/?session=${id}`)
  emit('close')
}

const deleteSession = async (id) => {
  try {
    await fetch(`${API_BASE}/session/${id}`, {method: 'DELETE'})
    fetchSessions(true)
    if (route.query.session === id) router.push('/')
  } catch (error) {
    console.error('删除会话失败:', error)
  }
}

onMounted(() => {
  fetchSessions(true)
  window.addEventListener('refresh-sessions', () => fetchSessions(true))
})

onUnmounted(() => {
  window.removeEventListener('refresh-sessions', () => fetchSessions(true))
})
</script>