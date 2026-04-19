<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from './components/Sidebar.vue'

const route = useRoute()
const isSidebarOpen = ref(false)
const isFullScreenPage = computed(() => route.path === '/settings')
const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}
</script>

<template>
  <div class="relative h-screen w-screen bg-white dark:bg-[#212121] overflow-hidden font-sans transition-colors duration-500">
    <Transition name="fade">
      <div v-if="isSidebarOpen && !isFullScreenPage" @click="isSidebarOpen = false"
           class="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-40 transition-all cursor-pointer"></div>
    </Transition>

    <aside v-if="!isFullScreenPage" :class="[isSidebarOpen ? 'translate-x-0' : '-translate-x-full']"
           class="fixed left-0 top-0 h-full w-64 sm:w-72 z-50 transition-transform duration-300 ease-out border-r border-transparent dark:border-[#2b2b2b] shadow-2xl dark:shadow-none">
      <Sidebar @close="isSidebarOpen = false"/>
    </aside>

    <main class="h-full w-full flex flex-col relative z-10">
      <router-view v-slot="{ Component }">
        <keep-alive>
          <component :is="Component" :is-sidebar-open="isSidebarOpen" @toggle-sidebar="toggleSidebar" />
        </keep-alive>
      </router-view>
    </main>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>