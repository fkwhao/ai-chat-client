<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import {
  ArrowLeft, Zap, MessageSquare, Hash, TrendingUp, Flame,
  BarChart3, Calendar, Minus, Maximize2, X
} from 'lucide-vue-next'

const emit = defineEmits(['back'])

const days = ref(7)
const loading = ref(true)
const trendChart = ref(null)
const trendRef = ref(null)

const winMinimize = () => window.electronAPI?.minimize()
const winMaximize = () => window.electronAPI?.maximize()
const winClose = () => window.electronAPI?.close()

// ── Mock data ──
const overview = ref({})
const modelBreakdown = ref([])
const dailyTrend = ref([])
const heatmap = ref([])

// ── Format ──
const fmt = (n) => {
  if (!n) return '0'
  if (n >= 100000000) return (n / 100000000).toFixed(1) + '亿'
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

// ── Mock data generators ──
const generateMock = (d) => {
  const now = new Date()
  const heat = []
  const trend = []
  const models = ['deepseek-v4-pro[1m]', 'GLM-5.2', 'gpt-4o']
  const modelTokens = { 'deepseek-v4-pro[1m]': 0, 'GLM-5.2': 0, 'gpt-4o': 0 }
  let totalT = 0, totalM = 0, activeDates = new Set()

  for (let i = d - 1; i >= -1; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const ds = date.toISOString().slice(0, 10)
    const count = Math.random() < 0.35 ? 0 : Math.floor(Math.random() * 60) + 1
    heat.push({ date: ds, count })
    if (count > 0) activeDates.add(ds)

    models.forEach(m => {
      const t = Math.random() < 0.55 ? 0 : Math.floor(Math.random() * 8000000) + 100000
      trend.push({ date: ds, model: m, tokens: t })
      modelTokens[m] += t
      totalT += t
    })
    totalM += count
  }

  const sorted = Object.entries(modelTokens).sort((a, b) => b[1] - a[1])
  const breakdown = sorted.map(([model, tokens]) => ({
    model, tokens, percentage: totalT > 0 ? (tokens * 100 / totalT) : 0
  }))

  const activeArr = Array.from(activeDates).sort()
  let streak = 0
  const today = new Date().toISOString().slice(0, 10)
  for (let i = 0; i < d; i++) {
    const d2 = new Date(now)
    d2.setDate(d2.getDate() - i)
    if (activeDates.has(d2.toISOString().slice(0, 10))) streak++
    else break
  }

  return {
    overview: {
      totalTokens: totalT, totalSessions: Math.floor(totalM / 5) || 1,
      totalMessages: totalM, activeDays: activeDates.size,
      currentStreak: streak,
      mostUsedModel: sorted[0]?.[0] || '',
      mostUsedModelPercentage: breakdown[0]?.percentage || 0
    },
    modelBreakdown: breakdown,
    dailyTrend: trend,
    heatmap: heat
  }
}

// ── Fetch / Mock ──
const fetchData = async () => {
  loading.value = true
  try {
    // Try real API first
    const [ovRes, mbRes, dtRes, hmRes] = await Promise.all([
      fetch(`/api/v1/history/usage-overview?days=${days.value}`),
      fetch(`/api/v1/history/model-breakdown?days=${days.value}`),
      fetch(`/api/v1/history/daily-trend?days=${days.value}`),
      fetch(`/api/v1/history/activity-heatmap?days=${Math.max(days.value, 30)}`)
    ])
    // Check all 4 responses before using real data
    if (ovRes.ok && mbRes.ok && dtRes.ok && hmRes.ok) {
      overview.value = await ovRes.json()
      modelBreakdown.value = await mbRes.json()
      dailyTrend.value = await dtRes.json()
      heatmap.value = await hmRes.json()
    } else {
      throw new Error('API not ready')
    }
  } catch {
    // Fallback to mock
    const mock = generateMock(days.value)
    overview.value = mock.overview
    modelBreakdown.value = mock.modelBreakdown
    dailyTrend.value = mock.dailyTrend
    heatmap.value = mock.heatmap
  } finally {
    loading.value = false
    await nextTick()
    renderTrend()
  }
}

// ── Heatmap (CSS grid, 252 days = 36 full weeks) ──
const HEAT_DAYS = 252

const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const heatmapCells = computed(() => {
  const countMap = {}
  heatmap.value.forEach(h => { countMap[h.date] = h.count })

  const end = new Date()
  end.setHours(23, 59, 59, 999)
  const start = new Date(end)
  start.setDate(start.getDate() - HEAT_DAYS + 1)
  start.setHours(0, 0, 0, 0)

  // No snapping — 252 days = exactly 36×7, always full columns
  const cells = []
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const ds = fmtDate(d)
    cells.push({
      date: ds,
      count: Math.floor((countMap[ds] || 0) / 2)
    })
  }
  return cells
})

const heatMax = computed(() => {
  const max = Math.max(...heatmapCells.value.map(c => c.count), 1)
  return max
})

const getHeatColor = (count, max) => {
  if (count <= max * 0.25) return '#40c463'
  if (count <= max * 0.5) return '#30a14e'
  if (count <= max * 0.75) return '#216e39'
  return '#1b4d2e'
}

const heatWeeks = computed(() => Math.ceil(heatmapCells.value.length / 7))
const hoveredIdx = ref(-1)

// ── Daily Trend (ECharts stacked bar) ──
const trendColors = ['#10a37f', '#7c3aed', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#f97316']

const renderTrend = () => {
  if (!trendRef.value) return
  if (trendChart.value) {
    try { trendChart.value.dispose() } catch (e) { /* ignore */ }
  }

  if (!dailyTrend.value || dailyTrend.value.length === 0) return

  try {
    const chart = echarts.init(trendRef.value)
    trendChart.value = chart

    // Generate full date range
    const datesFull = []
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - days.value + 1)
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      datesFull.push(fmtDate(d))
    }
    const dateLabels = datesFull.map(d => d.slice(5))  // "MM-DD"
    const modelMap = {}
    dailyTrend.value.forEach(d => {
      if (!modelMap[d.model]) modelMap[d.model] = {}
      modelMap[d.model][d.date] = (modelMap[d.model][d.date] || 0) + d.tokens
    })
    const models = Object.keys(modelMap)
    if (models.length === 0) return
    const series = models.map((model, i) => ({
      name: model,
      type: 'bar',
      stack: 'total',
      color: trendColors[i % trendColors.length],
      itemStyle: {
        borderRadius: i === models.length - 1 ? [5, 5, 0, 0] : [0, 0, 0, 0],
        borderColor: 'transparent',
        borderWidth: 1
      },
      data: datesFull.map(d => modelMap[model][d] || 0)
    }))

    chart.setOption({
      animationDuration: 600,
      animationEasing: 'cubicOut',
      barCategoryGap: '30%',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(0,0,0,0.03)' } },
        backgroundColor: '#1a1a1a',
        borderColor: '#333',
        textStyle: { color: '#ccc', fontSize: 12 },
        valueFormatter: (v) => v ? fmt(v) + ' tokens' : '0'
      },
      legend: {
        bottom: 0,
        textStyle: { color: '#999', fontSize: 11 },
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 16
      },
      grid: { top: 10, left: 50, right: 20, bottom: 45 },
      xAxis: {
        type: 'category',
        data: dateLabels,
        axisLabel: {
          color: '#aaa', fontSize: 10, rotate: 0,
          interval: dateLabels.length > 14 ? Math.ceil(dateLabels.length / 8) - 1 : 0
        },
        axisLine: { show: false },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#999', fontSize: 10, formatter: (v) => fmt(v), margin: 8 },
        splitLine: { lineStyle: { color: '#f3f4f6', width: 0.5 } },
        axisLine: { show: false },
        axisTick: { show: false }
      },
      series
    })
  } catch (e) {
    console.error('Trend chart render failed:', e)
  }
}

// ── Watch ──
watch(days, fetchData)

// ── Resize ──
const onResize = () => {
  trendChart.value?.resize()
}

onMounted(() => {
  fetchData()
  window.addEventListener('resize', onResize)
})
onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  trendChart.value?.dispose()
})
</script>

<template>
  <div class="flex flex-col h-full transition-colors duration-500">

    <!-- ═══ Top Bar (draggable, blends with sidebar) ═══ -->
    <div class="drag-region h-10 flex items-center px-4 justify-end shrink-0 select-none bg-[#f3f3f5] dark:bg-[#2b2b2b]">
      <div class="no-drag flex items-center gap-1">
        <button @click="winMinimize" title="最小化"
                class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#252525] transition-all text-gray-400 dark:text-[#666]">
          <Minus :size="15" stroke-width="2"/>
        </button>
        <button @click="winMaximize" title="最大化"
                class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#252525] transition-all text-gray-400 dark:text-[#666]">
          <Maximize2 :size="14" stroke-width="2"/>
        </button>
        <button @click="winClose" title="关闭"
                class="p-1.5 rounded-lg hover:bg-red-500/80 hover:text-white transition-all text-gray-400 dark:text-[#666]">
          <X :size="16" stroke-width="2"/>
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-[#131313] rounded-l-2xl">
      <div class="max-w-4xl mx-auto p-5 sm:p-8">

      <!-- Day selector -->
      <div class="flex items-center justify-end mb-6">
        <div class="flex bg-gray-100 dark:bg-[#1f1f1f] rounded-xl p-0.5">
          <button @click="days = 7" :class="days === 7 ? 'bg-white dark:bg-[#1f1f1f] shadow-sm text-gray-900 dark:text-[#eee]' : 'text-gray-500 dark:text-[#888]'"
                  class="px-4 py-1.5 text-[12px] font-semibold rounded-lg transition-all">最近 7 天</button>
          <button @click="days = 30" :class="days === 30 ? 'bg-white dark:bg-[#1f1f1f] shadow-sm text-gray-900 dark:text-[#eee]' : 'text-gray-500 dark:text-[#888]'"
                  class="px-4 py-1.5 text-[12px] font-semibold rounded-lg transition-all">最近 30 天</button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center py-20">
        <div class="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <template v-else>
        <!-- Title -->
        <h1 class="text-2xl font-bold text-gray-900 dark:text-[#e0e0e0] mb-1">使用统计</h1>
        <p class="text-sm text-gray-500 dark:text-[#777] mb-8">应用用量概览</p>

        <!-- Stat Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
          <div class="bg-white dark:bg-[#1f1f1f] rounded-2xl p-4 border border-gray-100 dark:border-white/8 shadow-sm">
            <div class="flex items-center gap-1.5 mb-2">
              <Zap :size="14" class="text-amber-500"/>
              <span class="text-[11px] text-gray-400 dark:text-[#777] font-medium">tokens 用量</span>
            </div>
            <div class="text-xl font-bold text-gray-900 dark:text-[#e0e0e0]">{{ fmt(overview.totalTokens) }}</div>
          </div>
          <div class="bg-white dark:bg-[#1f1f1f] rounded-2xl p-4 border border-gray-100 dark:border-white/8 shadow-sm">
            <div class="flex items-center gap-1.5 mb-2">
              <MessageSquare :size="14" class="text-green-500"/>
              <span class="text-[11px] text-gray-400 dark:text-[#777] font-medium">会话数量</span>
            </div>
            <div class="text-xl font-bold text-gray-900 dark:text-[#e0e0e0]">{{ overview.totalSessions }}</div>
          </div>
          <div class="bg-white dark:bg-[#1f1f1f] rounded-2xl p-4 border border-gray-100 dark:border-white/8 shadow-sm">
            <div class="flex items-center gap-1.5 mb-2">
              <Hash :size="14" class="text-purple-500"/>
              <span class="text-[11px] text-gray-400 dark:text-[#777] font-medium">对话轮数</span>
            </div>
            <div class="text-xl font-bold text-gray-900 dark:text-[#e0e0e0]">{{ Math.floor(overview.totalMessages / 2) }}</div>
          </div>
          <div class="bg-white dark:bg-[#1f1f1f] rounded-2xl p-4 border border-gray-100 dark:border-white/8 shadow-sm">
            <div class="flex items-center gap-1.5 mb-2">
              <Calendar :size="14" class="text-blue-500"/>
              <span class="text-[11px] text-gray-400 dark:text-[#777] font-medium">活跃天数</span>
            </div>
            <div class="text-xl font-bold text-gray-900 dark:text-[#e0e0e0]">{{ overview.activeDays }}</div>
          </div>
          <div class="bg-white dark:bg-[#1f1f1f] rounded-2xl p-4 border border-gray-100 dark:border-white/8 shadow-sm">
            <div class="flex items-center gap-1.5 mb-2">
              <Flame :size="14" class="text-orange-500"/>
              <span class="text-[11px] text-gray-400 dark:text-[#777] font-medium">连续天数</span>
            </div>
            <div class="text-xl font-bold text-gray-900 dark:text-[#e0e0e0]">{{ overview.currentStreak }}</div>
          </div>
        </div>

        <!-- Most Used Model Banner -->
        <div v-if="overview.mostUsedModel" class="bg-white dark:bg-[#1f1f1f] rounded-2xl p-4 border border-gray-100 dark:border-white/8 shadow-sm mb-6 flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
            <BarChart3 :size="16" class="text-emerald-500"/>
          </div>
          <div class="min-w-0">
            <div class="text-[11px] text-gray-400 dark:text-[#777] font-medium">最常用模型</div>
            <div class="text-sm font-bold text-gray-900 dark:text-[#e0e0e0] truncate">{{ overview.mostUsedModel }}</div>
          </div>
          <div class="ml-auto text-sm font-bold text-emerald-500 shrink-0">占比 {{ Math.round(overview.mostUsedModelPercentage) }}%</div>
        </div>

        <!-- Activity Heatmap -->
        <div class="bg-white dark:bg-[#1f1f1f] rounded-2xl p-4 border border-gray-100 dark:border-white/8 shadow-sm mb-6">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-[13px] font-bold text-gray-700 dark:text-[#ccc]">活跃热力图</h3>
            <!-- Color legend -->
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] text-gray-400 dark:text-[#666]">较少</span>
              <div class="w-3 h-3 rounded-[2px]" style="background:#ebedf0"></div>
              <div class="w-3 h-3 rounded-[2px]" style="background:#40c463"></div>
              <div class="w-3 h-3 rounded-[2px]" style="background:#30a14e"></div>
              <div class="w-3 h-3 rounded-[2px]" style="background:#216e39"></div>
              <div class="w-3 h-3 rounded-[2px]" style="background:#1b4d2e"></div>
              <span class="text-[10px] text-gray-400 dark:text-[#666]">较多</span>
            </div>
          </div>
          <div v-if="heatmap.length === 0" class="flex items-center justify-center h-32 text-[12px] text-gray-400 dark:text-[#666]">
            暂无活跃数据
          </div>
          <div v-else class="px-2">
            <div class="grid gap-[3px] w-full" :style="{ gridAutoFlow: 'column', gridTemplateRows: `repeat(7, 1fr)`, gridTemplateColumns: `repeat(${heatWeeks}, 1fr)` }">
              <template v-for="(cell, ci) in heatmapCells" :key="cell.date">
                <div @mouseenter="hoveredIdx = ci"
                     @mouseleave="hoveredIdx = -1"
                     class="rounded-[3px] cursor-pointer relative"
                     :class="cell.count > 0 ? '' : 'bg-gray-100 dark:bg-[#181818]'"
                     :style="cell.count > 0 ? { background: getHeatColor(cell.count, heatMax), aspectRatio: '1' } : { aspectRatio: '1' }">
                  <div v-if="hoveredIdx === ci" class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 dark:bg-[#333] text-white text-[11px] rounded-lg whitespace-nowrap pointer-events-none z-20 shadow-xl leading-relaxed">
                    <div class="font-semibold text-[12px] mb-0.5">{{ cell.date }}</div>
                    <div class="text-gray-300">{{ cell.count }} 轮对话</div>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- Daily Trend Chart -->
        <div class="bg-white dark:bg-[#1f1f1f] rounded-2xl p-4 border border-gray-100 dark:border-white/8 shadow-sm mb-6">
          <h3 class="text-[13px] font-bold text-gray-700 dark:text-[#ccc] mb-2">按天 Token 趋势</h3>
          <div v-if="dailyTrend.length === 0" class="flex items-center justify-center h-40 text-[12px] text-gray-400 dark:text-[#666]">
            暂无趋势数据
          </div>
          <div ref="trendRef" v-else class="w-full" style="height:300px"></div>
        </div>

        <!-- Model Breakdown -->
        <div class="bg-white dark:bg-[#1f1f1f] rounded-2xl p-4 border border-gray-100 dark:border-white/8 shadow-sm mb-6">
          <h3 class="text-[13px] font-bold text-gray-700 dark:text-[#ccc] mb-4">模型用量</h3>
          <div v-if="modelBreakdown.length === 0" class="flex items-center justify-center py-8 text-[12px] text-gray-400 dark:text-[#666]">
            暂无模型用量数据 — 新对话保存后会自动关联模型
          </div>
          <div v-else class="space-y-3">
            <div v-for="m in modelBreakdown" :key="m.model" class="flex items-center gap-3">
              <span class="text-[12px] font-medium text-gray-700 dark:text-[#ccc] w-36 truncate shrink-0">{{ m.model }}</span>
              <div class="flex-1 h-5 bg-gray-100 dark:bg-[#131313] rounded-full overflow-hidden">
                <div class="h-full bg-emerald-500 rounded-full transition-all duration-700"
                     :style="{ width: Math.max(m.percentage, 2) + '%' }"></div>
              </div>
              <span class="text-[12px] font-bold text-gray-600 dark:text-[#aaa] shrink-0 w-16 text-right">{{ Math.round(m.percentage) }}%</span>
              <span class="text-[11px] text-gray-400 dark:text-[#666] shrink-0 w-24 text-right">{{ fmt(m.tokens) }} tokens</span>
            </div>
          </div>
        </div>

        <!-- Tips -->
        <div class="p-3 bg-blue-50/50 dark:bg-[#1f1f1f]/50 rounded-xl text-[11px] text-gray-400 dark:text-[#666] border border-blue-100/50 dark:border-white/5">
          使用统计从数据记录开始计算，切换模型需保存消息后生效。部分历史数据可能未关联模型。
        </div>

      </template>

      </div>
    </div>
  </div>
</template>
