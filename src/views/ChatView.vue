<script setup>
import {ref, reactive, onMounted, onUnmounted, nextTick, computed, watch} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {
  Paperclip,
  ArrowUp,
  ChevronDown,
  ArrowDown,
  Square,
  ChevronRight,
  Check,
  Sun,
  Moon,
  Copy,
  Pencil,
  CheckCheck,
  X,
  FileText,
  History,
  PanelLeft,
  SquarePen,
  Sparkles
} from 'lucide-vue-next'
import {marked} from 'marked'
import hljs from 'highlight.js'
import {getEncoding, encodingForModel} from 'js-tiktoken'

const props = defineProps({
  isSidebarOpen: {type: Boolean, default: false}
})
const emit = defineEmits(['toggle-sidebar'])

const route = useRoute()
const router = useRouter()

const userInput = ref('')
const messageHistory = reactive([])
const selectedModelId = ref(null)
const availableModels = ref([])
const isStreaming = ref(false)
const abortController = ref(null)
const scrollContainer = ref(null)
const textareaRef = ref(null)
const isAtBottom = ref(true)
const isDropdownOpen = ref(false)
const isDarkMode = ref(false)
const copiedMessageIndex = ref(null)

const isCreatingSession = ref(false)
const API_BASE = '/api/v1/history'

const isRightSidebarOpen = ref(false)

const editingIndex = ref(-1)
const historyIndex = ref(-1)
const draftInput = ref('')

// Token 统计（只显示 totalTokens，从数据库获取）
const sessionTokenStats = ref({
  totalTokens: 0
})

// Tiktoken 编码器（使用 cl100k_base，适用于 GPT-4/3.5 和大多数模型）
let tokenizer = null
const initTokenizer = () => {
  if (!tokenizer) {
    try {
      tokenizer = getEncoding('cl100k_base')
    } catch (e) {
      console.error('Failed to init tokenizer:', e)
    }
  }
}

// 精确计算 token 数量
const countTokens = (text) => {
  if (!text) return 0
  if (!tokenizer) initTokenizer()
  if (!tokenizer) return 0
  try {
    return tokenizer.encode(text).length
  } catch (e) {
    return 0
  }
}

// 点击顶栏的“新对话”按钮
const startNewSession = () => {
  if (route.query.session) {
    router.push('/')
  }
}

const userQuestions = computed(() => {
  return messageHistory
      .map((msg, index) => ({...msg, index}))
      .filter(msg => msg.role === 'user')
})

const lastUserMessageIndex = computed(() => {
  for (let i = messageHistory.length - 1; i >= 0; i--) {
    if (messageHistory[i].role === 'user') return i
  }
  return -1
})

const sentQuestions = computed(() => {
  return messageHistory.filter(m => m.role === 'user').map(m => m.displayContent)
})

const scrollToMessage = (index) => {
  const el = document.getElementById(`msg-${index}`)
  if (el) {
    el.scrollIntoView({behavior: 'smooth', block: 'center'})
    const bubble = el.querySelector('.user-message, .ai-message')
    if (bubble) {
      bubble.classList.add('ring-2', 'ring-gray-400/30', 'dark:ring-[#404040]', 'scale-[1.01]', 'shadow-lg', 'duration-500')
      setTimeout(() => {
        bubble.classList.remove('ring-2', 'ring-gray-400/30', 'dark:ring-[#404040]', 'scale-[1.01]', 'shadow-lg')
        bubble.classList.add('duration-1000')
        setTimeout(() => bubble.classList.remove('duration-500', 'duration-1000'), 1000)
      }, 1000)
    }
    isRightSidebarOpen.value = false
  }
}

const editMessage = (index) => {
  if (isStreaming.value) stopGeneration()
  editingIndex.value = index
  userInput.value = messageHistory[index].displayContent
  nextTick(() => {
    autoResize();
    textareaRef.value?.focus()
  })
}

const cancelEdit = () => {
  editingIndex.value = -1
  userInput.value = ''
  nextTick(() => {
    autoResize()
  })
}

const handleTextareaKeydown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
    return
  }
  const questions = sentQuestions.value
  if (questions.length === 0) return

  if (e.key === 'ArrowUp') {
    if (e.target.selectionStart === 0 || historyIndex.value > -1) {
      if (historyIndex.value === -1) draftInput.value = userInput.value
      if (historyIndex.value < questions.length - 1) {
        historyIndex.value++
        userInput.value = questions[questions.length - 1 - historyIndex.value]
        e.preventDefault()
      }
    }
  }

  if (e.key === 'ArrowDown') {
    if (e.target.selectionEnd === userInput.value.length || historyIndex.value > -1) {
      if (historyIndex.value > -1) {
        historyIndex.value--
        if (historyIndex.value === -1) {
          userInput.value = draftInput.value
        } else {
          userInput.value = questions[questions.length - 1 - historyIndex.value]
        }
        e.preventDefault()
      }
    }
  }
}

const handleKeydown = (e) => {
  if (e.key === 'Escape') {
    if (previewFile.value) {
      closePreview()
    } else if (editingIndex.value !== -1) {
      cancelEdit()
    } else if (isRightSidebarOpen.value) {
      isRightSidebarOpen.value = false
    }
  }
}

const pendingFiles = ref([])
const previewFile = ref(null)
const USER_MESSAGE_CONTENT_VERSION = 1

const isStructuredUserMessageContent = (value) => {
  if (typeof value !== 'string' || !value.startsWith('__USER_MESSAGE__')) return false
  try {
    const parsed = JSON.parse(value.slice('__USER_MESSAGE__'.length))
    return parsed?.type === 'user_message' && parsed?.version === USER_MESSAGE_CONTENT_VERSION
  } catch (e) {
    return false
  }
}

const parseStructuredUserMessageContent = (value) => {
  if (!isStructuredUserMessageContent(value)) return null
  try {
    return JSON.parse(value.slice('__USER_MESSAGE__'.length))
  } catch (e) {
    return null
  }
}

const createMessageRecord = ({id, role, content, reasoningContent = '', isStreaming = false}) => {
  const parsedUserContent = role === 'user' ? parseStructuredUserMessageContent(content) : null
  return {
    id,
    role,
    content: typeof content === 'string' ? content : '',
    displayContent: parsedUserContent?.text || (typeof content === 'string' ? content : ''),
    attachments: parsedUserContent?.attachments || [],
    requestContent: parsedUserContent?.requestContent || (typeof content === 'string' ? content : ''),
    reasoningContent,
    isStreaming
  }
}

const addPendingFile = (file) => {
  const isImage = file.type.startsWith('image/')
  const previewUrl = URL.createObjectURL(file)
  pendingFiles.value.push({
    file: file,
    url: previewUrl,
    isImage: isImage,
    name: file.name,
    size: (file.size / 1024 / 1024).toFixed(2) + ' MB'
  })
}

const handlePaste = (e) => {
  const items = e.clipboardData?.items
  if (!items) return
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.kind === 'file') {
      const file = item.getAsFile()
      if (file) addPendingFile(file)
    }
  }
}

const onFileChange = (e) => {
  const files = e.target.files
  if (files) {
    for (let i = 0; i < files.length; i++) {
      addPendingFile(files[i])
    }
  }
  e.target.value = ''
}

const removePendingFile = (index) => {
  URL.revokeObjectURL(pendingFiles.value[index].url)
  pendingFiles.value.splice(index, 1)
}

const clearPendingFiles = () => {
  pendingFiles.value.forEach(item => URL.revokeObjectURL(item.url))
  pendingFiles.value = []
}

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`))
  reader.readAsDataURL(file)
})

const buildUserMessageContent = async (text, files) => {
  if (!files || files.length === 0) return text

  const contentParts = []
  if (text) {
    contentParts.push({type: 'text', text})
  }

  const attachmentNotes = []
  for (const item of files) {
    if (item.isImage) {
      const dataUrl = await fileToDataUrl(item.file)
      contentParts.push({
        type: 'image_url',
        image_url: {url: dataUrl}
      })
    } else {
      attachmentNotes.push(item.name)
    }
  }

  if (attachmentNotes.length > 0) {
    const note = `Attached files (non-image, metadata only): ${attachmentNotes.join(', ')}`
    if (contentParts.length === 0) {
      contentParts.push({type: 'text', text: note})
    } else {
      const firstText = contentParts.find(part => part.type === 'text')
      if (firstText) firstText.text = `${firstText.text}\n${note}`
      else contentParts.unshift({type: 'text', text: note})
    }
  }

  if (contentParts.length === 1 && contentParts[0].type === 'text') {
    return contentParts[0].text
  }

  return contentParts
}

const buildStoredUserMessageContent = async (text, files) => {
  if (!files || files.length === 0) return text

  const requestContent = await buildUserMessageContent(text, files)
  const attachments = []

  for (const item of files) {
    if (item.isImage) {
      attachments.push({
        type: 'image',
        name: item.name,
        size: item.size,
        url: await fileToDataUrl(item.file)
      })
    } else {
      attachments.push({
        type: 'file',
        name: item.name,
        size: item.size
      })
    }
  }

  return `__USER_MESSAGE__${JSON.stringify({
    type: 'user_message',
    version: USER_MESSAGE_CONTENT_VERSION,
    text,
    attachments,
    requestContent
  })}`
}

const openPreview = (item) => {
  previewFile.value = item
}
const closePreview = () => {
  previewFile.value = null
}

watch(() => route.query.session, async (newSessionId) => {
  if (isCreatingSession.value) {
    isCreatingSession.value = false
    return
  }

  // 重置 token 统计
  sessionTokenStats.value = { totalTokens: 0 }

  if (newSessionId) {
    try {
      // 获取会话信息（包括 totalTokens）
      const sessionRes = await fetch(`${API_BASE}/session/${newSessionId}`)
      if (sessionRes.ok) {
        const session = await sessionRes.json()
        sessionTokenStats.value.totalTokens = session.totalTokens || 0
      }

      const res = await fetch(`${API_BASE}/session/${newSessionId}/messages`)
      if (res.ok) {
        const msgs = await res.json()
        messageHistory.length = 0
        msgs.forEach(m => {
          messageHistory.push(createMessageRecord({
            id: m.id,
            role: m.role,
            content: m.content || '',
            reasoningContent: m.reasoningContent || '',
            isStreaming: false
          }))
        })
        scrollToBottom(true, false)
      }
    } catch (e) {
      console.error('加载历史记录失败:', e)
    }
  } else {
    messageHistory.length = 0
  }
}, {immediate: true})

const copyToClipboard = async (text, index) => {
  try {
    await navigator.clipboard.writeText(text)
    copiedMessageIndex.value = index
    setTimeout(() => {
      copiedMessageIndex.value = null
    }, 2000)
  } catch (err) {
  }
}

const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value
  if (isDarkMode.value) {
    document.documentElement.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', 'light')
  }
}

const selectedModelName = computed(() => {
  const model = availableModels.value.find(m => m.id === selectedModelId.value)
  return model ? model.name : '选择模型'
})

const closeDropdown = (e) => {
  if (isDropdownOpen.value && !e.target.closest('.model-selector-container')) isDropdownOpen.value = false
}

// =========== Markdown & Code Renderer ===========
const mainRenderer = new marked.Renderer()
mainRenderer.code = (tokenOrCode, langOrUndefined) => {
  try {
    const code = typeof tokenOrCode === 'object' ? tokenOrCode.text : tokenOrCode
    const lang = typeof tokenOrCode === 'object' ? tokenOrCode.lang : langOrUndefined
    const language = (lang && hljs.getLanguage(lang)) ? lang : 'plaintext'
    const highlighted = hljs.highlight(code, {language}).value
    let encodedCode = ''
    try {
      encodedCode = encodeURIComponent(code)
    } catch (e) {
    }

    return `
  <div class="my-5 rounded-xl bg-gray-50 dark:bg-[#191919] border border-gray-200/60 dark:border-[#333333] shadow-sm font-sans relative overflow-clip group/code">

    <div class="flex items-center justify-between px-4 py-2 bg-gray-100/90 dark:bg-[#2b2b2b]/90 backdrop-blur-md sticky top-0 z-10 border-b border-gray-200/50 dark:border-[#333333]">
      <span class="text-[11px] font-mono text-gray-500 dark:text-[#a3a3a3] font-bold uppercase tracking-wider">${language}</span>
      <button class="copy-btn flex items-center gap-1.5 text-gray-500 dark:text-[#a3a3a3] hover:text-gray-800 dark:hover:text-gray-100 transition-colors text-[12px] font-medium" data-code="${encodedCode}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        <span>复制</span>
      </button>
    </div>

    <div class="overflow-x-auto p-4 code-scrollbar relative">
      <pre style="background:transparent!important; padding:0!important; margin:0!important; border:none!important;" class="text-[14px] leading-relaxed text-gray-800 dark:text-[#d4d4d4]"><code class="hljs language-${language}">${highlighted}</code></pre>
    </div>
  </div>
`
  } catch (error) {
    return `<pre><code>${typeof tokenOrCode === 'object' ? tokenOrCode.text : tokenOrCode}</code></pre>`
  }
}

const reasoningRenderer = new marked.Renderer()
reasoningRenderer.code = (tokenOrCode) => {
  const textCode = typeof tokenOrCode === 'object' ? tokenOrCode.text : tokenOrCode
  return `<div class="bg-gray-100/80 dark:bg-[#2b2b2b]/50 rounded-lg my-2 border border-gray-200/80 dark:border-[#333333] p-3"><pre style="background:transparent!important; padding:0!important; margin:0!important; border:none!important; white-space: pre-wrap !important; word-break: break-all !important;" class="text-gray-500 dark:text-[#a3a3a3] text-[13px] font-mono"><code>${textCode}</code></pre></div>`
}

const renderMarkdown = (content) => {
  if (!content) return '';
  try {
    const safeContent = content.replace(/(\d)\s*~\s*(\d)/g, '$1-$2');
    return marked.parse(safeContent, {renderer: mainRenderer, breaks: true})
  } catch (e) {
    return content
  }
}

const renderReasoning = (content) => {
  if (!content) return '';
  try {
    const safeContent = content.replace(/(\d)\s*~\s*(\d)/g, '$1-$2');
    return marked.parse(safeContent, {renderer: reasoningRenderer, breaks: true})
  } catch (e) {
    return content
  }
}

const handleMainClick = async (e) => {
  const btn = e.target.closest('.copy-btn')
  if (btn) {
    try {
      const code = decodeURIComponent(btn.getAttribute('data-code'))
      await navigator.clipboard.writeText(code)
      const originalInner = btn.innerHTML
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> <span>复制成功</span>`
      btn.classList.add('text-green-500', 'dark:text-green-400')
      setTimeout(() => {
        btn.innerHTML = originalInner;
        btn.classList.remove('text-green-500', 'dark:text-green-400')
      }, 2000)
    } catch (err) {
    }
  }
}

onMounted(() => {
  document.addEventListener('click', closeDropdown)
  document.addEventListener('keydown', handleKeydown)
  if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    isDarkMode.value = true
    document.documentElement.classList.add('dark')
  }
  const saved = localStorage.getItem('ai_models')
  if (saved) {
    availableModels.value = JSON.parse(saved)
    if (availableModels.value.length > 0) selectedModelId.value = availableModels.value[0].id
  }
})

onUnmounted(() => {
  document.removeEventListener('click', closeDropdown)
  document.removeEventListener('keydown', handleKeydown)
})

const checkScroll = () => {
  if (!scrollContainer.value) return
  const {scrollTop, clientHeight, scrollHeight} = scrollContainer.value
  isAtBottom.value = scrollHeight - scrollTop - clientHeight < 60
}

const scrollToBottom = async (force = false, smooth = true) => {
  await nextTick()
  if (!scrollContainer.value) return
  if (force || isAtBottom.value) {
    scrollContainer.value.scrollTo({top: scrollContainer.value.scrollHeight, behavior: smooth ? 'smooth' : 'auto'})
  }
}

const autoResize = () => {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

const stopGeneration = () => {
  if (abortController.value) {
    abortController.value.abort()
    abortController.value = null
    isStreaming.value = false
    if (messageHistory.length > 0) messageHistory[messageHistory.length - 1].isStreaming = false
  }
}

const selectModel = (id) => {
  selectedModelId.value = id;
  isDropdownOpen.value = false
}

const sendMessage = async () => {
  if ((!userInput.value.trim() && pendingFiles.value.length === 0) || isStreaming.value) return
  const currentModel = availableModels.value.find(m => m.id === selectedModelId.value)
  const inputText = userInput.value.trim()
  const filesForRequest = [...pendingFiles.value]
  const imageNames = filesForRequest.filter(item => item.isImage).map(item => item.name)
  const fileNames = filesForRequest.map(item => item.name)
  const userDisplayText = inputText || (imageNames.length > 0
          ? `[Image] ${imageNames.join(', ')}`
          : `[File] ${fileNames.join(', ')}`)
  if (!currentModel || !currentModel.url || !currentModel.key) return alert('请先完善 API 配置')

  if (editingIndex.value !== -1) {
    const targetMessageId = messageHistory[editingIndex.value].id
    const activeSessionId = route.query.session
    messageHistory.splice(editingIndex.value)

    if (activeSessionId && targetMessageId) {
      try {
        await fetch(`/api/v1/history/session/${activeSessionId}/messages/from/${targetMessageId}`, {method: 'DELETE'})
      } catch (e) {
        console.error('后端截断历史记录失败:', e)
      }
    }
    editingIndex.value = -1
  }

  historyIndex.value = -1
  draftInput.value = ''

  let activeSessionId = route.query.session
  if (!activeSessionId) {
    isCreatingSession.value = true
    try {
      const res = await fetch(`${API_BASE}/session?title=${encodeURIComponent(userDisplayText.substring(0, 15) || '新对话')}`, {method: 'POST'})
      const session = await res.json()
      activeSessionId = session.id
      router.replace(`/?session=${activeSessionId}`)
      window.dispatchEvent(new CustomEvent('refresh-sessions'))
    } catch (e) {
      isCreatingSession.value = false
      return
    }
  }

  const storedUserContent = await buildStoredUserMessageContent(inputText, filesForRequest)
  const lastUserContent = await buildUserMessageContent(inputText, filesForRequest)

  messageHistory.push(createMessageRecord({
    role: 'user',
    content: storedUserContent
  }))
  userInput.value = ''
  nextTick(() => {
    if (textareaRef.value) textareaRef.value.style.height = 'auto'
  })

  isStreaming.value = true
  scrollToBottom(true, true)

  messageHistory.push(createMessageRecord({role: 'assistant', content: '', reasoningContent: '', isStreaming: true}))
  const currentIndex = messageHistory.length - 1
  abortController.value = new AbortController()

  try {
    const requestMessages = messageHistory
        .slice(0, -1)
        .map(m => ({role: m.role, content: m.requestContent}))

    const response = await fetch('/api/v1/chat/completions', {
      method: 'POST',
      signal: abortController.value.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-User-Api-Key': currentModel.key.trim(),
        'X-Target-Api-Url': currentModel.url.trim()
      },
      body: JSON.stringify({model: currentModel.model.trim(), messages: requestMessages, stream: true})
    })

    if (!response.ok) throw new Error(`状态码: ${response.status}`)
    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    while (true) {
      const {done, value} = await reader.read()
      if (done) break
      buffer += decoder.decode(value, {stream: true})
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmedLine = line.trim()
        if (!trimmedLine) continue
        if (trimmedLine.startsWith('data:')) {
          const payload = trimmedLine.slice(5).trim()
          if (payload === '[DONE]') continue
          try {
            const data = JSON.parse(payload)
            const delta = data.choices[0].delta?.content || ''
            const reasoning = data.choices[0].delta?.reasoning_content || ''

            if (reasoning) messageHistory[currentIndex].reasoningContent += reasoning
            if (delta) messageHistory[currentIndex].content += delta
            scrollToBottom(false, false)
          } catch (e) {
          }
        }
      }
    }
  } catch (error) {
    if (error.name === 'AbortError') messageHistory[currentIndex].content += `\n\n*[已停止生成]*`
    else messageHistory[currentIndex].content += `\n\n**[系统异常]**: 连接断开`
  } finally {
    messageHistory[currentIndex].isStreaming = false
    isStreaming.value = false
    abortController.value = null
    scrollToBottom(false, true)

    // 计算本次新增的 token
    const userText = typeof storedUserContent === 'string' ? storedUserContent : ''
    const aiText = (messageHistory[currentIndex].content || '') + (messageHistory[currentIndex].reasoningContent || '')
    const newTokens = countTokens(userText) + countTokens(aiText)

    // 更新前端显示的 totalTokens（累加）
    sessionTokenStats.value.totalTokens += newTokens

    clearPendingFiles()

    if (activeSessionId) {
      try {
        const userMsg = messageHistory[currentIndex - 1]
        const aiMsg = messageHistory[currentIndex]
        await fetch(`${API_BASE}/session/${activeSessionId}/message-pair`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            userContent: storedUserContent,
            assistantContent: aiMsg.content,
            reasoningContent: aiMsg.reasoningContent,
            tokens: newTokens
          })
        })
        window.dispatchEvent(new CustomEvent('refresh-sessions'))
      } catch (e) {
      }
    }
  }
}
</script>

<template>
  <div class="flex flex-col h-full bg-white dark:bg-[#212121] relative transition-colors duration-500">

    <header
        class="h-14 flex items-center px-4 sm:px-6 justify-between sticky top-0 z-30 bg-white/80 dark:bg-[#212121]/90 backdrop-blur-2xl border-b border-gray-100 dark:border-transparent transition-colors duration-500 shrink-0">

      <div class="flex items-center gap-1.5">
        <button @click="emit('toggle-sidebar')"
                class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#2f2f2f] transition-all text-gray-500 dark:text-[#a3a3a3]">
          <PanelLeft :size="18"/>
        </button>
        <div class="relative group/tooltip flex items-center" v-if="!isSidebarOpen">
          <button @click="startNewSession"
                  class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#2f2f2f] transition-all text-gray-500 dark:text-[#a3a3a3]">
            <SquarePen :size="18"/>
          </button>
          <div
              class="absolute top-[110%] left-1/2 -translate-x-1/2 mt-1 px-2.5 py-1.5 bg-gray-800 dark:bg-[#333333] text-white text-[11px] font-medium rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-lg z-50">
            开启新对话
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <div
            class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold text-gray-400 dark:text-[#737373] uppercase tracking-widest transition-colors mr-2">
          <div class="w-1.5 h-1.5 bg-green-500/80 rounded-full"></div>
          System Ready
        </div>

        <!-- Token 统计显示 -->
        <div v-if="messageHistory.length > 0"
             class="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold text-gray-400 dark:text-[#737373] uppercase tracking-widest transition-colors bg-gray-100/60 dark:bg-[#2b2b2b]/60">
          <span class="text-gray-600 dark:text-[#aaa]">{{ sessionTokenStats.totalTokens }}</span>
          <span class="text-gray-400 dark:text-[#666]">tokens</span>
        </div>

        <button @click="isRightSidebarOpen = !isRightSidebarOpen" title="查看本局提问大纲"
                :class="isRightSidebarOpen ? 'bg-gray-100 dark:bg-[#2f2f2f] text-gray-900 dark:text-[#eee]' : 'text-gray-500 dark:text-[#a3a3a3]'"
                class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#2f2f2f] transition-all relative z-[110]">
          <History :size="18"/>
        </button>

        <button @click="toggleTheme"
                class="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#2f2f2f] transition-all text-gray-500 dark:text-[#a3a3a3]">
          <Sun v-if="isDarkMode" :size="18"/>
          <Moon v-else :size="18"/>
        </button>
      </div>
    </header>

    <main ref="scrollContainer" @scroll="checkScroll" @click="handleMainClick"
          class="flex-1 overflow-y-auto px-4 sm:px-6 z-0 custom-scrollbar relative">
      <div class="pt-4"></div>

      <template v-if="messageHistory.length > 0">
        <div v-for="(msg, i) in messageHistory" :key="msg.id || i" :id="'msg-' + i"
             class="w-full flex flex-col max-w-[950px] mx-auto group/msg transition-all duration-300 mb-6"
             :class="{
               'items-end origin-bottom-right': msg.role === 'user',
               'items-start origin-top-left': msg.role !== 'user',
               'opacity-30 grayscale pointer-events-none': editingIndex !== -1 && i >= editingIndex
             }">

          <details v-if="msg.reasoningContent" class="group mb-2 ml-1" :open="msg.isStreaming">
            <summary
                class="flex items-center gap-1.5 cursor-pointer list-none text-gray-400 dark:text-[#888888] hover:text-gray-600 dark:hover:text-[#a3a3a3] transition-colors text-[13px] font-medium select-none">
              <div
                  class="w-4 h-4 flex items-center justify-center rounded-full bg-gray-100 dark:bg-[#2b2b2b] transition-colors">
                <ChevronRight class="w-3 h-3 transition-transform group-open:rotate-90"/>
              </div>
              {{ (msg.isStreaming && !msg.content) ? '深度思考中...' : '深度思考' }}
            </summary>
            <div class="mt-2 pl-4 border-l-2 border-gray-200 dark:border-[#333333] ml-2">
              <div class="markdown-body reasoning-content leading-relaxed break-words"
                   v-html="renderReasoning(msg.reasoningContent)"></div>
            </div>
          </details>

          <div v-if="(msg.role === 'user' ? msg.displayContent : msg.content) || msg.attachments?.length > 0 || (msg.isStreaming && !msg.reasoningContent)" :class="[
            'relative px-5 py-3.5 leading-relaxed text-[15px] transition-all max-w-[95%] sm:max-w-[85%]',
            msg.role === 'user'
              ? 'user-message bg-blue-50/60 border border-blue-100/50 dark:bg-[#2f2f2f] dark:border-transparent text-gray-900 dark:text-[#e0e0e0] rounded-[22px] rounded-tr-[4px] shadow-sm'
              : 'ai-message bg-transparent dark:bg-transparent text-gray-800 dark:text-[#d4d4d4] rounded-[22px] border-none shadow-none'
          ]">
            <div v-if="msg.attachments?.length > 0" class="flex flex-wrap gap-3 mb-3">
              <template v-for="(attachment, attachmentIndex) in msg.attachments" :key="`${i}-${attachmentIndex}`">
                <img v-if="attachment.type === 'image'" :src="attachment.url" :alt="attachment.name"
                     @click="openPreview({ ...attachment, isImage: true })"
                     class="max-w-[220px] max-h-[220px] object-cover rounded-2xl border border-gray-200/60 dark:border-[#3a3a3a] cursor-zoom-in"/>
                <div v-else
                     class="flex items-center gap-2 bg-white/70 dark:bg-[#191919] border border-gray-200 dark:border-[#333333] rounded-xl px-3 py-2 max-w-[260px]">
                  <FileText :size="18" class="shrink-0"/>
                  <div class="min-w-0">
                    <div class="text-[12px] font-semibold truncate">{{ attachment.name }}</div>
                    <div class="text-[11px] opacity-70">{{ attachment.size }}</div>
                  </div>
                </div>
              </template>
            </div>
            <div v-if="msg.role === 'user' ? msg.displayContent : msg.content"
                 class="markdown-body break-words"
                 v-html="renderMarkdown(msg.role === 'user' ? msg.displayContent : msg.content)"></div>
          </div>

          <div
              class="flex items-center gap-1.5 mt-1 mx-1 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-200"
              :class="msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'">

            <div class="relative group/btn" v-if="msg.role === 'user' && i === lastUserMessageIndex">
              <button @click="editMessage(i)"
                      class="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2b2b2b] transition-all">
                <Pencil :size="14" stroke-width="2.5"/>
              </button>
              <div
                  class="absolute bottom-[110%] left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 dark:bg-[#404040] text-white text-[11px] rounded-md opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                重新编辑
              </div>
            </div>

            <div class="relative group/btn" v-if="!msg.isStreaming">
              <button @click="copyToClipboard(msg.role === 'user' ? (msg.displayContent || '[附件]') : msg.content, i)"
                      class="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2b2b2b] transition-all">
                <CheckCheck v-if="copiedMessageIndex === i" :size="14" class="text-green-500" stroke-width="2.5"/>
                <Copy v-else :size="14" stroke-width="2.5"/>
              </button>
              <div
                  class="absolute bottom-[110%] left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 dark:bg-[#404040] text-white text-[11px] rounded-md opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                复制全文
              </div>
            </div>

          </div>

        </div>
        <div class="h-56 w-full shrink-0 pointer-events-none"></div>
      </template>
    </main>

    <footer
        class="absolute w-full px-4 sm:px-8 z-20 flex justify-center flex-col items-center transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
        :class="messageHistory.length === 0
          ? 'bottom-[50%] translate-y-[50%] pointer-events-none'
          : 'bottom-0 translate-y-0 pt-16 pb-6 pointer-events-none bg-gradient-to-t from-white via-white/95 dark:from-[#212121] dark:via-[#212121]/95 to-transparent'"
    >
      <div class="relative w-full max-w-[950px] pointer-events-auto flex flex-col items-center">

        <div v-if="messageHistory.length === 0"
             class="flex flex-col items-center gap-4 mb-8 text-gray-800 dark:text-[#e0e0e0] animate-fade-in transition-all">
          <Sparkles :size="36" class="text-blue-500/80"/>
          <h2 class="text-2xl font-semibold tracking-wide text-gray-800 dark:text-[#d4d4d4]">
            有什么可以帮到你？
          </h2>
        </div>

        <Transition name="fade-up">
          <div v-if="editingIndex !== -1" class="absolute -top-12 left-0 right-0 flex justify-center z-10 w-full">
            <div
                class="bg-gray-800/90 dark:bg-[#2b2b2b] text-white dark:text-[#e0e0e0] px-4 py-2 rounded-full text-[12px] shadow-sm flex items-center gap-3 border border-gray-700 dark:border-[#333333]">
              <span class="flex items-center gap-1.5 font-medium tracking-wide">
                <Pencil :size="13" class="text-blue-400"/>
                正在重新编辑，发送后将覆盖后续对话 (Esc取消)
              </span>
              <div class="w-[1px] h-3 bg-gray-600"></div>
              <button @click="cancelEdit"
                      class="text-gray-400 hover:text-white transition-colors tracking-widest font-bold">
                取消
              </button>
            </div>
          </div>
        </Transition>

        <Transition name="fade-up">
          <button v-if="!isAtBottom && messageHistory.length > 0" @click="scrollToBottom(true, true)"
                  class="absolute left-1/2 -translate-x-1/2 bg-white dark:bg-[#2b2b2b] border border-gray-200 dark:border-[#333333] text-gray-500 dark:text-[#a3a3a3] rounded-full p-2.5 shadow-md hover:text-gray-900 dark:hover:text-white transition-all duration-300 z-10"
                  :class="editingIndex !== -1 ? '-top-28' : '-top-14'">
            <ArrowDown :size="18"/>
          </button>
        </Transition>

        <div class="relative w-full group/wrapper">
          <div
              class="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-[30px] opacity-0 group-focus-within/wrapper:opacity-40 dark:group-focus-within/wrapper:opacity-20 blur-md transition-opacity duration-500 pointer-events-none"></div>

          <div
              class="relative w-full bg-white dark:bg-[#2b2b2b] border border-gray-200 dark:border-transparent rounded-3xl shadow-sm p-2 transition-all duration-300">
            <div v-if="pendingFiles.length > 0"
                 class="flex flex-wrap gap-3 px-3 pt-2 pb-1 border-b border-gray-100 dark:border-[#333333] mb-2">
              <div v-for="(item, index) in pendingFiles" :key="index"
                   @click="openPreview(item)"
                   class="relative group flex items-center gap-2 bg-gray-50 dark:bg-[#191919] border border-gray-200 dark:border-[#333333] rounded-xl p-1.5 pr-3 max-w-[200px] cursor-pointer">
                <img v-if="item.isImage" :src="item.url"
                     class="w-10 h-10 object-cover rounded-lg border border-gray-200/50 dark:border-transparent"/>
                <div v-else
                     class="w-10 h-10 flex items-center justify-center bg-gray-200 dark:bg-[#2b2b2b] text-gray-500 dark:text-gray-400 rounded-lg">
                  <FileText :size="20"/>
                </div>
                <div class="flex flex-col overflow-hidden">
                  <span class="text-[12px] font-bold text-gray-700 dark:text-[#e0e0e0] truncate">{{ item.name }}</span>
                  <span class="text-[10px] text-gray-400 dark:text-[#888888]">{{ item.size }}</span>
                </div>
                <button @click.stop="removePendingFile(index)"
                        class="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white dark:bg-[#404040] border border-gray-200 dark:border-transparent rounded-full flex items-center justify-center text-gray-500 dark:text-gray-200 hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all z-10">
                  <X :size="12"/>
                </button>
              </div>
            </div>

            <textarea
                ref="textareaRef" v-model="userInput" @input="autoResize" @keydown="handleTextareaKeydown"
                @paste="handlePaste"
                class="w-full bg-transparent border-none focus:ring-0 focus:outline-none px-4 py-3 text-gray-800 dark:text-[#e0e0e0] placeholder-gray-400 dark:placeholder-[#737373] resize-none max-h-[160px] overflow-y-auto text-[15px] leading-relaxed custom-scrollbar"
                placeholder="发消息或 Ctrl+V 粘贴文件... (Shift+Enter 换行, Esc 取消编辑)" rows="1"
            ></textarea>

            <div class="flex items-center justify-between pl-2 pr-1 pt-1 pb-1 w-full">
              <label
                  class="p-2.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-[#404040] dark:hover:text-[#e0e0e0] rounded-full cursor-pointer transition-colors">
                <Paperclip :size="18"/>
                <input type="file" class="hidden" multiple @change="onFileChange">
              </label>

              <div class="flex items-center gap-2">
                <div class="relative hidden sm:flex model-selector-container">
                  <div @click="isDropdownOpen = !isDropdownOpen"
                       class="flex items-center gap-1.5 bg-gray-50 dark:bg-[#191919] hover:bg-gray-100 dark:hover:bg-[#333333] transition-colors rounded-xl px-3 py-1.5 cursor-pointer text-[12px] font-medium text-gray-600 dark:text-[#a3a3a3] select-none">
                    {{ selectedModelName }}
                    <ChevronDown :size="14" class="transition-transform duration-200"
                                 :class="{ 'rotate-180': isDropdownOpen }"/>
                  </div>

                  <Transition name="dropdown-fade">
                    <div v-if="isDropdownOpen"
                         class="absolute bottom-full mb-2 right-0 w-48 bg-white dark:bg-[#2b2b2b] border border-gray-100 dark:border-[#333333] rounded-2xl shadow-lg overflow-hidden z-50">
                      <div v-for="m in availableModels" :key="m.id"
                           @click="selectModel(m.id)"
                           class="px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#404040] cursor-pointer text-[13px] text-gray-700 dark:text-[#e0e0e0] flex items-center justify-between group transition-colors">
                        <span class="truncate pr-2">{{ m.name }}</span>
                        <Check v-if="selectedModelId === m.id" :size="14" class="text-blue-500 shrink-0"/>
                      </div>
                    </div>
                  </Transition>
                </div>

                <button v-if="!isStreaming" @click="sendMessage"
                        :class="(userInput.trim() || pendingFiles.length > 0) ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-[#404040] text-gray-400 dark:text-[#737373] cursor-not-allowed'"
                        class="p-2 rounded-xl transition-all">
                  <ArrowUp :size="18" stroke-width="2.5"/>
                </button>

                <button v-else @click="stopGeneration"
                        class="bg-gray-100 dark:bg-[#404040] text-gray-500 dark:text-[#a3a3a3] hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-200 dark:hover:bg-[#4f4f4f] p-2 rounded-xl transition-all">
                  <Square :size="16" class="fill-current"/>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="messageHistory.length > 0"
           class="mt-2 text-center text-[11px] text-gray-400 dark:text-[#737373] font-medium select-none pointer-events-auto transition-opacity duration-500">
        AI 工具可能会犯错，请核实重要信息。
      </div>
    </footer>

    <Transition name="preview-fade">
      <div v-if="previewFile"
           class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
           @click="closePreview">
        <button @click="closePreview"
                class="absolute top-6 right-6 text-white/70 hover:text-white p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all z-50">
          <X :size="24" stroke-width="2.5"/>
        </button>
        <div
            class="relative max-w-5xl max-h-[90vh] w-full mx-6 flex flex-col items-center justify-center outline-none preview-content"
            @click.stop>
          <img v-if="previewFile.isImage" :src="previewFile.url"
               class="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl select-none"/>
        </div>
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="isRightSidebarOpen" @click="isRightSidebarOpen = false"
           class="fixed inset-0 bg-white/40 dark:bg-black/40 backdrop-blur-[4px] z-[100] transition-all cursor-pointer"></div>
    </Transition>

    <Transition name="outline-dropdown">
      <div v-if="isRightSidebarOpen"
           class="fixed top-16 right-4 sm:right-6 w-[320px] max-h-[75vh] z-[110] overflow-y-auto hide-scrollbar pointer-events-auto origin-top-right">

        <div v-if="userQuestions.length === 0" class="flex flex-col items-center justify-center h-24 text-gray-500 dark:text-[#888] space-y-2 bg-white/40 dark:bg-[#2b2b2b]/40 backdrop-blur-md rounded-2xl p-4 mt-2">
          <History :size="24" stroke-width="1.5" class="opacity-40"/>
          <span class="text-[12px] tracking-wide">暂无对话大纲</span>
        </div>

        <div v-else class="relative pl-1 py-2 mt-2">
          <div class="absolute left-[15px] top-4 bottom-4 w-[2px] bg-gray-300/80 dark:bg-gray-600/60 rounded-full"></div>

          <div v-for="(q, i) in userQuestions" :key="q.index"
               @click="scrollToMessage(q.index)"
               class="relative flex gap-4 items-start group cursor-pointer animate-ladder-drop py-2.5"
               :style="`animation-delay: ${i * 60}ms`">

            <div class="relative z-10 w-6 h-6 rounded-full bg-white dark:bg-[#212121] flex items-center justify-center shrink-0 group-hover:-translate-y-0.5 transition-transform duration-300 shadow-sm border border-gray-200/60 dark:border-white/10">
              <div class="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-[#666] group-hover:bg-blue-500 group-hover:shadow-[0_0_8px_rgba(59,130,246,0.6)] transition-all duration-300 group-hover:scale-150"></div>
            </div>

            <div class="flex-1 transition-all duration-500 group-hover:-translate-x-1 group-hover:bg-white/90 dark:group-hover:bg-[#2b2b2b]/90 group-hover:backdrop-blur-xl p-2 -m-2 rounded-xl border border-transparent group-hover:border-gray-200/50 dark:group-hover:border-white/5 group-hover:shadow-lg overflow-hidden">
              <div class="text-[13.5px] font-medium text-gray-800 dark:text-[#ddd] group-hover:text-gray-900 dark:group-hover:text-white leading-relaxed line-clamp-1 group-hover:line-clamp-none group-hover:whitespace-normal transition-colors duration-300 drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)] dark:drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                {{ q.displayContent || '[附件]' }}
              </div>
            </div>

          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>

/* --- 苹果风气泡下拉框动画 --- */
.outline-dropdown-enter-active,
.outline-dropdown-leave-active {
  transition: opacity 0.3s ease, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.outline-dropdown-enter-from,
.outline-dropdown-leave-to {
  opacity: 0;
  transform: scale(0.9) translateY(-10px);
}

/* --- 列表项阶梯掉落动画 --- */
.animate-ladder-drop {
  opacity: 0;
  animation: ladderDrop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes ladderDrop {
  0% {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.4s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.animate-fade-in {
  animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes fadeIn {
  0% {
    opacity: 0;
    transform: translateY(10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-up-enter-active, .fade-up-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-up-enter-from, .fade-up-leave-to {
  opacity: 0;
  transform: translate(-50%, 10px) scale(0.9);
}

.dropdown-fade-enter-active, .dropdown-fade-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.dropdown-fade-enter-from, .dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.95);
}

.preview-fade-enter-active, .preview-fade-leave-active {
  transition: opacity 0.3s ease;
}

.preview-fade-enter-from, .preview-fade-leave-to {
  opacity: 0;
}

.preview-fade-enter-active .preview-content, .preview-fade-leave-active .preview-content {
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.preview-fade-enter-from .preview-content, .preview-fade-leave-to .preview-content {
  transform: scale(0.9) translateY(20px);
}

.code-block-wrapper {
  isolation: isolate;
}

.markdown-body {
  word-wrap: break-word;
  word-break: break-word;
  overflow-wrap: break-word;
  transition: color 0.3s;
}

details > summary::-webkit-details-marker {
  display: none;
}

/* 彻底隐藏滚动条，但保留鼠标滚轮滑动功能 */
.hide-scrollbar {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;     /* Firefox */
}
.hide-scrollbar::-webkit-scrollbar {
  display: none;             /* Chrome, Safari and Opera */
}
</style>
