import { createRouter, createWebHashHistory } from 'vue-router'
import ChatView from '../views/ChatView.vue'
import SettingsView from '../views/SettingsView.vue'
import TokenStatsView from '../views/TokenStatsView.vue'

const routes = [
    { path: '/', component: ChatView },
    { path: '/settings', component: SettingsView },
    { path: '/token-stats', component: TokenStatsView }
]

const router = createRouter({
    history: createWebHashHistory(),
    routes
})

export default router