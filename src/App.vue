<script setup>
import { ref, watch, onMounted, onUnmounted, provide } from 'vue'
import Sidebar from './components/Sidebar.vue'
import SettingsView from './views/SettingsView.vue'
import TokenStatsView from './views/TokenStatsView.vue'

// ── Current view ──
const currentView = ref('chat') // 'chat' | 'api-settings' | 'token-stats'
const navigateTo = (view) => { currentView.value = view }

// ── Theme ──
const isDarkMode = ref(false)
onMounted(() => {
  if (localStorage.getItem('theme') === 'dark' ||
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    isDarkMode.value = true
    document.documentElement.classList.add('dark')
  }
})
watch(isDarkMode, (val) => {
  if (val) {
    document.documentElement.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', 'light')
  }
})
const toggleTheme = () => { isDarkMode.value = !isDarkMode.value }
provide('isDarkMode', isDarkMode)

// ── Sidebar ──
const isSidebarOpen = ref(localStorage.getItem('sidebar_open') !== 'false')
const sidebarWidth = ref(Number(localStorage.getItem('sidebar_width')) || 260)

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
  localStorage.setItem('sidebar_open', String(isSidebarOpen.value))
}

// ── Drag resize ──
const isResizing = ref(false)
let startX = 0, startWidth = 0

const onResizeMouseDown = (e) => {
  e.preventDefault()
  isResizing.value = true
  startX = e.clientX
  startWidth = sidebarWidth.value
  document.addEventListener('mousemove', onResizeMouseMove)
  document.addEventListener('mouseup', onResizeMouseUp)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}
const onResizeMouseMove = (e) => {
  if (!isResizing.value) return
  sidebarWidth.value = Math.min(500, Math.max(200, startWidth + e.clientX - startX))
}
const onResizeMouseUp = () => {
  isResizing.value = false
  document.removeEventListener('mousemove', onResizeMouseMove)
  document.removeEventListener('mouseup', onResizeMouseUp)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  localStorage.setItem('sidebar_width', String(sidebarWidth.value))
}
onUnmounted(() => {
  document.removeEventListener('mousemove', onResizeMouseMove)
  document.removeEventListener('mouseup', onResizeMouseUp)
})
</script>

<template>
  <div class="flex h-screen w-screen bg-[#f7f7f8] dark:bg-[#1c1c1c] overflow-hidden font-sans transition-colors duration-500">

    <!-- Sidebar -->
    <aside v-if="isSidebarOpen"
           :style="{ width: sidebarWidth + 'px' }"
           class="h-full shrink-0 overflow-hidden transition-[width] duration-300 ease-out">
      <div class="h-full" :style="{ width: sidebarWidth + 'px' }">
        <Sidebar :current-view="currentView"
                 :is-dark-mode="isDarkMode"
                 @navigate="navigateTo"
                 @toggle-theme="toggleTheme"
                 @toggle-sidebar="toggleSidebar" />
      </div>
    </aside>

    <!-- Resize handle (invisible, shows on hover) -->
    <div v-if="isSidebarOpen"
         @mousedown="onResizeMouseDown"
         class="w-[4px] h-full shrink-0 cursor-col-resize hover:bg-gray-300/60 dark:hover:bg-white/10 transition-colors relative z-30">
    </div>

    <!-- Main content -->
    <main class="flex-1 min-w-0 h-full flex flex-col bg-white dark:bg-[#0d0d0d] rounded-l-2xl overflow-hidden">

      <!-- Chat -->
      <router-view v-if="currentView === 'chat'" v-slot="{ Component }">
        <keep-alive>
          <component :is="Component" :is-sidebar-open="isSidebarOpen" @toggle-sidebar="toggleSidebar" />
        </keep-alive>
      </router-view>

      <!-- API Settings -->
      <SettingsView v-else-if="currentView === 'api-settings'"
                    @back="navigateTo('chat')" />

      <!-- Token Stats -->
      <TokenStatsView v-else-if="currentView === 'token-stats'"
                      @back="navigateTo('chat')"
                      @navigate-session="navigateTo('chat')" />

    </main>
  </div>
</template>
