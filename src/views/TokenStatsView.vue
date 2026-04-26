<script setup>
import { ref, onMounted, computed } from 'vue'
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
  router.push(`/?session=${sessionId}`)
}

onMounted(fetchData)
</script>

<template>
  <div class="min-h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#171717] dark:to-[#1a1a1a] transition-colors duration-500">
    <div class="max-w-6xl mx-auto p-6 sm:p-10">

      <!-- Header -->
      <div class="flex items-center justify-between mb-10">
        <button @click="router.back()"
                class="flex items-center gap-2 text-gray-500 dark:text-[#a3a3a3] hover:text-gray-900 dark:hover:text-[#e0e0e0] transition-colors group">
          <ArrowLeft :size="20" class="group-hover:-translate-x-1 transition-transform"/>
          <span class="text-sm font-bold">返回</span>
        </button>
        <div class="text-[11px] font-bold text-gray-400 dark:text-[#666] uppercase tracking-widest">
          Token Analytics
        </div>
      </div>

      <!-- Title -->
      <div class="mb-10">
        <h1 class="text-3xl sm:text-4xl font-black text-gray-900 dark:text-[#e0e0e0] tracking-tight flex items-center gap-3">
          <div class="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/20">
            <BarChart3 :size="28" class="text-white"/>
          </div>
          Token 统计分析
        </h1>
        <p class="mt-3 text-gray-500 dark:text-[#888] text-sm">查看所有会话的 Token 消耗情况</p>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="flex items-center justify-center py-20">
        <div class="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <template v-else>
        <!-- Stats Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10">

          <!-- Total Tokens -->
          <div class="group relative overflow-hidden bg-white dark:bg-[#262626] rounded-2xl p-5 sm:p-6 border border-gray-100 dark:border-[#333] shadow-sm hover:shadow-lg transition-all duration-300">
            <div class="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full"></div>
            <div class="flex items-center gap-3 mb-3">
              <div class="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-xl">
                <Zap :size="18" class="text-blue-600 dark:text-blue-400"/>
              </div>
              <span class="text-[11px] font-bold text-gray-400 dark:text-[#888] uppercase tracking-wider">总消耗</span>
            </div>
            <div class="text-2xl sm:text-3xl font-black text-gray-900 dark:text-[#e0e0e0]">
              {{ formatNumber(stats.totalTokens) }}
            </div>
            <div class="text-xs text-gray-400 dark:text-[#666] mt-1">tokens</div>
          </div>

          <!-- Total Sessions -->
          <div class="group relative overflow-hidden bg-white dark:bg-[#262626] rounded-2xl p-5 sm:p-6 border border-gray-100 dark:border-[#333] shadow-sm hover:shadow-lg transition-all duration-300">
            <div class="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-500/10 to-transparent rounded-bl-full"></div>
            <div class="flex items-center gap-3 mb-3">
              <div class="p-2 bg-green-100 dark:bg-green-500/20 rounded-xl">
                <MessageSquare :size="18" class="text-green-600 dark:text-green-400"/>
              </div>
              <span class="text-[11px] font-bold text-gray-400 dark:text-[#888] uppercase tracking-wider">会话数</span>
            </div>
            <div class="text-2xl sm:text-3xl font-black text-gray-900 dark:text-[#e0e0e0]">
              {{ formatNumber(stats.totalSessions) }}
            </div>
            <div class="text-xs text-gray-400 dark:text-[#666] mt-1">sessions</div>
          </div>

          <!-- Total Messages -->
          <div class="group relative overflow-hidden bg-white dark:bg-[#262626] rounded-2xl p-5 sm:p-6 border border-gray-100 dark:border-[#333] shadow-sm hover:shadow-lg transition-all duration-300">
            <div class="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-500/10 to-transparent rounded-bl-full"></div>
            <div class="flex items-center gap-3 mb-3">
              <div class="p-2 bg-purple-100 dark:bg-purple-500/20 rounded-xl">
                <Hash :size="18" class="text-purple-600 dark:text-purple-400"/>
              </div>
              <span class="text-[11px] font-bold text-gray-400 dark:text-[#888] uppercase tracking-wider">消息数</span>
            </div>
            <div class="text-2xl sm:text-3xl font-black text-gray-900 dark:text-[#e0e0e0]">
              {{ formatNumber(stats.totalMessages) }}
            </div>
            <div class="text-xs text-gray-400 dark:text-[#666] mt-1">messages</div>
          </div>

          <!-- Avg Tokens -->
          <div class="group relative overflow-hidden bg-white dark:bg-[#262626] rounded-2xl p-5 sm:p-6 border border-gray-100 dark:border-[#333] shadow-sm hover:shadow-lg transition-all duration-300">
            <div class="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-orange-500/10 to-transparent rounded-bl-full"></div>
            <div class="flex items-center gap-3 mb-3">
              <div class="p-2 bg-orange-100 dark:bg-orange-500/20 rounded-xl">
                <TrendingUp :size="18" class="text-orange-600 dark:text-orange-400"/>
              </div>
              <span class="text-[11px] font-bold text-gray-400 dark:text-[#888] uppercase tracking-wider">平均消耗</span>
            </div>
            <div class="text-2xl sm:text-3xl font-black text-gray-900 dark:text-[#e0e0e0]">
              {{ formatNumber(Math.round(stats.avgTokensPerSession)) }}
            </div>
            <div class="text-xs text-gray-400 dark:text-[#666] mt-1">tokens/session</div>
          </div>

        </div>

        <!-- Ranking Section -->
        <div class="bg-white dark:bg-[#262626] rounded-2xl border border-gray-100 dark:border-[#333] shadow-sm overflow-hidden">
          <div class="px-6 py-5 border-b border-gray-100 dark:border-[#333] bg-gradient-to-r from-gray-50 to-transparent dark:from-[#2b2b2b]">
            <h2 class="text-lg font-bold text-gray-900 dark:text-[#e0e0e0] flex items-center gap-2">
              <TrendingUp :size="20" class="text-blue-500"/>
              Token 消耗排行
            </h2>
            <p class="text-xs text-gray-400 dark:text-[#888] mt-1">按消耗量排序的会话列表</p>
          </div>

          <div v-if="topSessions.length === 0" class="p-10 text-center text-gray-400 dark:text-[#888]">
            <BarChart3 :size="40" class="mx-auto mb-3 opacity-30"/>
            <p class="text-sm">暂无数据</p>
          </div>

          <div v-else class="divide-y divide-gray-100 dark:divide-[#333]">
            <div v-for="(session, index) in topSessions" :key="session.sessionId"
                 @click="goToSession(session.sessionId)"
                 class="group px-6 py-4 hover:bg-gray-50 dark:hover:bg-[#2b2b2b] cursor-pointer transition-all duration-200 flex items-center gap-4">

              <!-- Rank Badge -->
              <div class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                   :class="{
                     'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-lg shadow-yellow-500/30': index === 0,
                     'bg-gradient-to-br from-gray-300 to-gray-400 text-white': index === 1,
                     'bg-gradient-to-br from-orange-300 to-orange-400 text-white': index === 2,
                     'bg-gray-100 dark:bg-[#333] text-gray-500 dark:text-[#888]': index > 2
                   }">
                {{ index + 1 }}
              </div>

              <!-- Session Info -->
              <div class="flex-1 min-w-0">
                <div class="text-sm font-semibold text-gray-800 dark:text-[#e0e0e0] truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {{ session.title || '未命名会话' }}
                </div>
                <div class="text-xs text-gray-400 dark:text-[#888] flex items-center gap-1 mt-0.5">
                  <Calendar :size="12"/>
                  {{ session.updateTime || '未知时间' }}
                </div>
              </div>

              <!-- Token Count -->
              <div class="shrink-0 text-right">
                <div class="text-lg font-bold text-gray-900 dark:text-[#e0e0e0]">
                  {{ formatNumber(session.totalTokens) }}
                </div>
                <div class="text-[10px] text-gray-400 dark:text-[#888] uppercase">tokens</div>
              </div>

              <!-- Arrow -->
              <ChevronRight :size="18" class="shrink-0 text-gray-300 dark:text-[#555] group-hover:text-blue-500 group-hover:translate-x-1 transition-all"/>
            </div>
          </div>
        </div>

        <!-- Tips -->
        <div class="mt-8 p-5 bg-blue-50/50 dark:bg-blue-500/5 rounded-xl border border-blue-100/50 dark:border-blue-500/10">
          <div class="flex items-start gap-3">
            <Zap :size="18" class="text-blue-500 shrink-0 mt-0.5"/>
            <div class="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              <span class="font-bold">提示：</span>
              Token 统计从功能添加后开始计算，历史会话可能显示为 0。编辑或删除消息不会减少已记录的 Token 消耗。
            </div>
          </div>
        </div>

      </template>

    </div>
  </div>
</template>
