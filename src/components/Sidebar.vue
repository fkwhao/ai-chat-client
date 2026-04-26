<template>
  <aside class="h-full w-full bg-[#f9f9f9] dark:bg-[#171717] flex flex-col relative transition-colors duration-500 border-r border-gray-200/50 dark:border-white/5 font-sans">

    <div class="px-4 pt-6 pb-4 space-y-4">
      <button @click="createNewSession" class="w-full group relative flex items-center justify-between px-4 py-3 bg-white dark:bg-[#262626] border border-gray-200/80 dark:border-transparent rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-none hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:border-gray-300 dark:hover:bg-[#333333] active:scale-[0.98] transition-all duration-300 overflow-hidden">
        <div class="flex items-center gap-2.5 z-10">
          <div class="bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 p-1 rounded-md group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white dark:group-hover:bg-blue-500 transition-all duration-300">
            <Plus :size="16" stroke-width="2.5" />
          </div>
          <span class="text-[14px] font-semibold text-gray-700 dark:text-[#d4d4d4] group-hover:text-gray-900 dark:group-hover:text-white transition-colors">新对话</span>
        </div>
        <SquarePen :size="15" class="text-gray-300 dark:text-[#555] group-hover:text-gray-400 transition-colors group-hover:translate-x-0.5" />
      </button>

      <div class="relative group">
        <Search :size="15"
                class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#666] group-focus-within:text-blue-500 transition-colors duration-300"/>
        <input v-model="searchQuery" type="text" placeholder="搜索历史..."
               class="w-full bg-gray-100/80 dark:bg-[#212121] border-2 border-transparent focus:bg-white dark:focus:bg-[#1a1a1a] focus:border-blue-500/20 dark:focus:border-blue-500/30 rounded-[10px] pl-9 pr-4 py-2 text-[13px] text-gray-700 dark:text-[#e0e0e0] placeholder-gray-400 dark:placeholder-[#666] outline-none transition-all duration-300 shadow-sm focus:shadow-md"/>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto px-2 space-y-4 custom-scrollbar pb-6" @scroll="handleScroll">
      <div v-for="(group, groupName) in groupedHistory" :key="groupName" class="space-y-1">

        <div v-if="group.length > 0"
             class="sticky top-0 z-20 px-3 pt-2 pb-1.5 bg-[#f9f9f9]/90 dark:bg-[#171717]/90 backdrop-blur-md">
          <span class="text-[11px] font-bold text-gray-400 dark:text-[#666] tracking-wider">{{ groupName }}</span>
        </div>

        <div v-for="item in group" :key="item.id"
             @click="selectSession(item.id)"
             :class="route.query.session === item.id
                ? 'bg-white dark:bg-[#262626] shadow-sm border border-gray-200/80 dark:border-white/5'
                : 'border border-transparent hover:bg-gray-100 dark:hover:bg-[#212121]'"
             class="group/item flex items-center justify-between mx-1 p-2.5 rounded-xl cursor-pointer transition-all duration-200">

          <div class="flex items-center gap-3 overflow-hidden pl-1">
            <div class="w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-300"
                 :class="route.query.session === item.id ? 'bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]' : 'bg-transparent group-hover/item:bg-gray-300 dark:group-hover/item:bg-[#444]'"></div>
            <span class="truncate text-[13px] transition-colors duration-200"
                  :class="route.query.session === item.id ? 'font-semibold text-gray-800 dark:text-[#eee]' : 'text-gray-500 dark:text-[#888] group-hover/item:text-gray-700 dark:group-hover/item:text-[#bbb]'">
              {{ item.title }}
            </span>
          </div>

          <button @click.stop="deleteSession(item.id)"
                  class="opacity-0 group-hover/item:opacity-100 p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 rounded-md transition-all text-gray-300 dark:text-[#555] active:scale-90">
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

    <div class="p-4 bg-[#f9f9f9] dark:bg-[#171717] border-t border-gray-200/50 dark:border-white/5 shrink-0 space-y-1">
      <router-link to="/token-stats" @click="emit('close')"
                   class="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-[#262626] transition-all text-gray-500 dark:text-[#888] hover:text-gray-800 dark:hover:text-[#ccc] group active:scale-[0.98]">
        <BarChart3 :size="16" class="transition-transform duration-300 group-hover:scale-110"/>
        <span class="text-[13px] font-semibold">Token 统计</span>
      </router-link>
      <router-link to="/settings" @click="emit('close')"
                   class="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-[#262626] transition-all text-gray-500 dark:text-[#888] hover:text-gray-800 dark:hover:text-[#ccc] group active:scale-[0.98]">
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