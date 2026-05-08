<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeft,
  TrendingUp,
  MessageSquare,
  Hash,
  BarChart3,
  Zap,
  Calendar,
  ChevronRight
} from 'lucide-vue-next'

const router = useRouter()
const emit = defineEmits(['close'])

const stats = ref({
  totalTokens: 0,
  totalSessions: 0,
  totalMessages: 0,
  avgTokensPerSession: 0
})

const topSessions = ref([])
const isLoading = ref(true)

const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

const fetchData = async () => {
  isLoading.value = true
  try {
    const [statsRes, rankingRes] = await Promise.all([
      fetch('/api/v1/history/token-stats'),
      fetch('/api/v1/history/token-ranking?limit=10')
    ])
    if (statsRes.ok) stats.value = await statsRes.json()
    if (rankingRes.ok) topSessions.value = await rankingRes.json()
  } catch (e) {
    console.error('Failed to fetch token stats:', e)
  } finally {
    isLoading.value = false
  }
}

const goToSession = (sessionId) => {
  emit('close')
  router.push(`/?session=${sessionId}`)
}

const goBack = () => {
  emit('close')
  router.back()
}

onMounted(fetchData)
</script>

<template>
  <div class="h-full overflow-y-auto bg-gradient-to-b from-gray-50 to-gray-100 dark:from-[#171717] dark:to-[#141414] transition-colors duration-500 custom-scrollbar">
    <div class="max-w-4xl mx-auto p-6 sm:p-8">

      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <button @click="goBack"
                class="flex items-center gap-2 text-gray-500 dark:text-[#888] hover:text-gray-900 dark:hover:text-[#e0e0e0] transition-colors group">
          <ArrowLeft :size="18" class="group-hover:-translate-x-1 transition-transform"/>
          <span class="text-sm font-medium">返回</span>
        </button>
      </div>

      <!-- Title -->
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-gray-900 dark:text-[#e8e8e8]">Token 统计</h1>
        <p class="mt-1.5 text-sm text-gray-500 dark:text-[#888]">查看所有会话的 Token 消耗情况</p>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="flex items-center justify-center py-20">
        <div class="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <template v-else>
        <!-- Stats Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

          <div class="bg-white dark:bg-[#1e1e1e] rounded-2xl p-5 border border-gray-100 dark:border-[#2a2a2a] shadow-sm hover:shadow-md transition-shadow">
            <div class="flex items-center gap-2 mb-3">
              <div class="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-lg">
                <Zap :size="16" class="text-blue-500"/>
              </div>
              <span class="text-xs text-gray-500 dark:text-[#888] font-medium">总消耗</span>
            </div>
            <div class="text-2xl font-bold text-gray-900 dark:text-[#e8e8e8]">
              {{ formatNumber(stats.totalTokens) }}
            </div>
          </div>

          <div class="bg-white dark:bg-[#1e1e1e] rounded-2xl p-5 border border-gray-100 dark:border-[#2a2a2a] shadow-sm hover:shadow-md transition-shadow">
            <div class="flex items-center gap-2 mb-3">
              <div class="p-2 bg-green-50 dark:bg-green-500/10 rounded-lg">
                <MessageSquare :size="16" class="text-green-500"/>
              </div>
              <span class="text-xs text-gray-500 dark:text-[#888] font-medium">会话数</span>
            </div>
            <div class="text-2xl font-bold text-gray-900 dark:text-[#e8e8e8]">
              {{ formatNumber(stats.totalSessions) }}
            </div>
          </div>

          <div class="bg-white dark:bg-[#1e1e1e] rounded-2xl p-5 border border-gray-100 dark:border-[#2a2a2a] shadow-sm hover:shadow-md transition-shadow">
            <div class="flex items-center gap-2 mb-3">
              <div class="p-2 bg-purple-50 dark:bg-purple-500/10 rounded-lg">
                <Hash :size="16" class="text-purple-500"/>
              </div>
              <span class="text-xs text-gray-500 dark:text-[#888] font-medium">消息数</span>
            </div>
            <div class="text-2xl font-bold text-gray-900 dark:text-[#e8e8e8]">
              {{ formatNumber(stats.totalMessages) }}
            </div>
          </div>

          <div class="bg-white dark:bg-[#1e1e1e] rounded-2xl p-5 border border-gray-100 dark:border-[#2a2a2a] shadow-sm hover:shadow-md transition-shadow">
            <div class="flex items-center gap-2 mb-3">
              <div class="p-2 bg-orange-50 dark:bg-orange-500/10 rounded-lg">
                <TrendingUp :size="16" class="text-orange-500"/>
              </div>
              <span class="text-xs text-gray-500 dark:text-[#888] font-medium">平均消耗</span>
            </div>
            <div class="text-2xl font-bold text-gray-900 dark:text-[#e8e8e8]">
              {{ formatNumber(Math.round(stats.avgTokensPerSession)) }}
            </div>
          </div>

        </div>

        <!-- Ranking Section -->
        <div class="bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-100 dark:border-[#2a2a2a] shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100 dark:border-[#2a2a2a]">
            <h2 class="font-semibold text-gray-900 dark:text-[#e8e8e8]">消耗排行</h2>
          </div>

          <div v-if="topSessions.length === 0" class="p-10 text-center text-gray-400 dark:text-[#888]">
            <BarChart3 :size="36" class="mx-auto mb-3 opacity-30"/>
            <p class="text-sm">暂无数据</p>
          </div>

          <div v-else class="divide-y divide-gray-50 dark:divide-[#252525]">
            <div v-for="(session, index) in topSessions" :key="session.sessionId"
                 @click="goToSession(session.sessionId)"
                 class="group px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-[#222] cursor-pointer transition-colors flex items-center gap-4">

              <!-- Rank -->
              <div class="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                   :class="{
                     'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-sm': index === 0,
                     'bg-gray-100 text-gray-600 dark:bg-[#2a2a2a] dark:text-[#aaa]': index === 1,
                     'bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400': index === 2,
                     'bg-gray-50 text-gray-400 dark:bg-[#222] dark:text-[#666]': index > 2
                   }">
                {{ index + 1 }}
              </div>

              <!-- Session Info -->
              <div class="flex-1 min-w-0">
                <div class="text-sm text-gray-800 dark:text-[#e0e0e0] truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors font-medium">
                  {{ session.title || '未命名会话' }}
                </div>
                <div class="text-xs text-gray-400 dark:text-[#666] flex items-center gap-1.5 mt-1">
                  <Calendar :size="12"/>
                  {{ session.updateTime || '未知时间' }}
                </div>
              </div>

              <!-- Token Count -->
              <div class="text-sm font-semibold text-gray-600 dark:text-[#aaa]">
                {{ formatNumber(session.totalTokens) }}
              </div>

              <ChevronRight :size="16" class="text-gray-300 dark:text-[#444] group-hover:text-blue-500 transition-colors"/>
            </div>
          </div>
        </div>

        <!-- Tips -->
        <div class="mt-6 p-4 bg-blue-50/50 dark:bg-[#1a1a2a]/50 rounded-xl text-xs text-gray-500 dark:text-[#888] border border-blue-100/50 dark:border-blue-900/20">
          Token 统计从功能添加后开始计算，历史会话可能显示为 0。编辑或删除消息不会减少已记录的消耗。
        </div>

      </template>

    </div>
  </div>
</template>
