<script setup>
import { reactive, onMounted } from 'vue'
import { ArrowLeft, Plus, Trash2, TerminalSquare } from 'lucide-vue-next'

const emit = defineEmits(['back'])

const state = reactive({ models: [] })

onMounted(() => {
  const saved = localStorage.getItem('ai_models')
  state.models = saved ? JSON.parse(saved) : [{id: Date.now(), name: '默认模型', url: '', key: '', model: ''}]
})

const addModel = () => { state.models.push({id: Date.now(), name: '新模型', url: '', key: '', model: ''}) }

const saveAll = () => {
  localStorage.setItem('ai_models', JSON.stringify(state.models))
  alert('API 配置已保存！')
}
</script>

<template>
  <div class="h-full overflow-y-auto bg-white dark:bg-[#0d0d0d] transition-colors duration-500 custom-scrollbar">
    <div class="p-8 sm:p-12 max-w-4xl mx-auto w-full space-y-10">

      <div class="flex items-center justify-between">
        <button @click="emit('back')" class="flex items-center gap-2 text-gray-500 dark:text-[#777] hover:text-gray-900 dark:hover:text-[#e0e0e0] transition-colors group">
          <ArrowLeft :size="20" class="group-hover:-translate-x-1 transition-transform"/>
          <span class="text-sm font-bold">返回对话</span>
        </button>
      </div>

      <header>
        <h2 class="text-3xl font-black text-gray-900 dark:text-[#e0e0e0] tracking-tight">系统配置</h2>
        <div class="flex gap-6 mt-6 border-b border-gray-200/60 dark:border-white/8">
          <div class="pb-3 border-b-2 border-gray-700 dark:border-white/15 font-bold text-lg text-gray-900 dark:text-[#e0e0e0] flex items-center gap-2">
            <TerminalSquare :size="20"/> API与模型管理
          </div>
        </div>
      </header>

      <section class="space-y-6">
        <div class="flex justify-between items-center">
          <h3 class="text-xl font-bold text-gray-800 dark:text-[#d0d0d0]">配置列表</h3>
          <button @click="addModel" class="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 dark:bg-[#1a1a1a] dark:hover:bg-[#222222] text-white px-5 py-2.5 rounded-xl transition-all active:scale-95 shadow-sm hover:shadow-md">
            <Plus :size="18"/> <span class="text-sm font-bold">添加新模型</span>
          </button>
        </div>

        <div class="space-y-5">
          <div v-for="(m, index) in state.models" :key="m.id" class="bg-white dark:bg-[#111111] p-8 rounded-2xl border border-gray-100 dark:border-white/8 shadow-sm dark:shadow-none relative group transition-all hover:shadow-md">
            <button @click="state.models.splice(index, 1)" class="absolute top-6 right-6 text-gray-300 dark:text-[#555] hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg"><Trash2 :size="18"/></button>
            <div class="grid grid-cols-2 gap-6">
              <div class="col-span-2">
                <label class="text-[10px] font-bold text-gray-400 dark:text-[#555] uppercase tracking-widest">模型备注名称</label>
                <input v-model="m.name" class="w-full mt-2 border-b-2 border-gray-200 dark:border-white/10 focus:border-gray-500 dark:focus:border-white/20 outline-none py-2.5 text-lg font-bold bg-transparent text-gray-900 dark:text-[#e0e0e0] transition-colors"/>
              </div>
              <div>
                <label class="text-[10px] font-bold text-gray-400 dark:text-[#555] uppercase tracking-widest">API Endpoint</label>
                <input v-model="m.url" class="w-full mt-2 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl p-3.5 text-[13px] text-gray-800 dark:text-[#d0d0d0] outline-none focus:border-gray-400 dark:focus:border-white/15 focus:ring-2 focus:ring-gray-100 dark:focus:ring-white/5 transition-all" />
              </div>
              <div>
                <label class="text-[10px] font-bold text-gray-400 dark:text-[#555] uppercase tracking-widest">Model Name</label>
                <input v-model="m.model" class="w-full mt-2 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl p-3.5 text-[13px] text-gray-800 dark:text-[#d0d0d0] outline-none focus:border-gray-400 dark:focus:border-white/15 focus:ring-2 focus:ring-gray-100 dark:focus:ring-white/5 transition-all" />
              </div>
              <div class="col-span-2">
                <label class="text-[10px] font-bold text-gray-400 dark:text-[#555] uppercase tracking-widest">API Key</label>
                <input v-model="m.key" type="password" class="w-full mt-2 bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-xl p-3.5 text-[13px] text-gray-800 dark:text-[#d0d0d0] outline-none focus:border-gray-400 dark:focus:border-white/15 focus:ring-2 focus:ring-gray-100 dark:focus:ring-white/5 transition-all"/>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div class="pt-6 flex justify-center pb-20">
        <button @click="saveAll" class="bg-gray-800 hover:bg-gray-900 dark:bg-[#1a1a1a] dark:hover:bg-[#222222] text-white px-14 py-4 rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-95 font-bold">
          保存全局配置
        </button>
      </div>
    </div>
  </div>
</template>
