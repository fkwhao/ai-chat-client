<script setup>
import { reactive, onMounted } from 'vue'
import { ArrowLeft, Plus, Trash2, TerminalSquare } from 'lucide-vue-next'

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
  <div class="h-full w-full overflow-y-auto bg-gray-50 dark:bg-[#212121] transition-colors duration-500 custom-scrollbar">
    <div class="p-8 sm:p-12 max-w-4xl mx-auto w-full space-y-10">

      <div class="flex items-center justify-between">
        <button @click="$router.back()" class="flex items-center gap-2 text-gray-500 dark:text-[#a3a3a3] hover:text-gray-900 dark:hover:text-[#e0e0e0] transition-colors group">
          <ArrowLeft :size="20" class="group-hover:-translate-x-1 transition-transform"/>
          <span class="text-sm font-bold">返回对话</span>
        </button>
      </div>

      <header>
        <h2 class="text-3xl font-black text-gray-900 dark:text-[#e0e0e0] tracking-tight">系统配置</h2>
        <div class="flex gap-6 mt-6 border-b border-gray-200 dark:border-[#333333]">
          <div class="pb-3 border-b-2 border-blue-600 dark:border-gray-400 font-bold text-lg text-gray-900 dark:text-[#e0e0e0] flex items-center gap-2">
            <TerminalSquare :size="20"/> API与模型管理
          </div>
        </div>
      </header>

      <section class="space-y-6">
        <div class="flex justify-between items-center">
          <h3 class="text-xl font-bold text-gray-800 dark:text-[#d4d4d4]">配置列表</h3>
          <button @click="addModel" class="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-[#2b2b2b] dark:hover:bg-[#333333] text-white dark:text-[#e0e0e0] px-4 py-2.5 rounded-xl transition-all active:scale-95">
            <Plus :size="18"/> <span class="text-sm font-bold">添加新模型</span>
          </button>
        </div>

        <div class="space-y-6">
          <div v-for="(m, index) in state.models" :key="m.id" class="bg-white dark:bg-[#2b2b2b] p-8 rounded-[20px] border border-gray-100 dark:border-transparent shadow-sm dark:shadow-none relative group transition-all">
            <button @click="state.models.splice(index, 1)" class="absolute top-6 right-6 text-gray-300 dark:text-[#737373] hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 :size="18"/></button>
            <div class="grid grid-cols-2 gap-8">
              <div class="col-span-2">
                <label class="text-[10px] font-bold text-gray-400 dark:text-[#737373] uppercase tracking-widest">模型备注名称</label>
                <input v-model="m.name" class="w-full mt-1 border-b border-gray-200 dark:border-[#404040] focus:border-blue-500 dark:focus:border-gray-400 outline-none py-2 text-lg font-bold bg-transparent text-gray-900 dark:text-[#e0e0e0] transition-colors"/>
              </div>
              <div>
                <label class="text-[10px] font-bold text-gray-400 dark:text-[#737373] uppercase tracking-widest">API Endpoint</label>
                <input v-model="m.url" class="w-full mt-2 bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#333333] rounded-xl p-3 text-[13px] text-gray-800 dark:text-[#d4d4d4] outline-none focus:border-blue-400 dark:focus:border-gray-500 transition-colors" />
              </div>
              <div>
                <label class="text-[10px] font-bold text-gray-400 dark:text-[#737373] uppercase tracking-widest">Model Name</label>
                <input v-model="m.model" class="w-full mt-2 bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#333333] rounded-xl p-3 text-[13px] text-gray-800 dark:text-[#d4d4d4] outline-none focus:border-blue-400 dark:focus:border-gray-500 transition-colors" />
              </div>
              <div class="col-span-2">
                <label class="text-[10px] font-bold text-gray-400 dark:text-[#737373] uppercase tracking-widest">API Key</label>
                <input v-model="m.key" type="password" class="w-full mt-2 bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-[#333333] rounded-xl p-3 text-[13px] text-gray-800 dark:text-[#d4d4d4] outline-none focus:border-blue-400 dark:focus:border-gray-500 transition-colors"/>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div class="pt-6 flex justify-center pb-20">
        <button @click="saveAll" class="bg-blue-600 dark:bg-[#1e1e1e] text-white dark:text-[#e0e0e0] px-12 py-4 rounded-2xl hover:bg-blue-700 dark:hover:bg-[#333333] transition-all shadow-md active:scale-95 font-bold border dark:border-[#333333] border-transparent">
          保存全局配置
        </button>
      </div>
    </div>
  </div>
</template>