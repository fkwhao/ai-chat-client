import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite' // 新增这一行

export default defineConfig({
    plugins: [
        vue(),
        tailwindcss(), // 注册 Tailwind 插件
    ],
    server: {
        port: 5173,
        strictPort: true,
        proxy: {
            // 当你前端请求以 /api 开头的路径时...
            '/api': {
                target: 'http://localhost:8090', // Vite 请求转发到 Spring Boot
                changeOrigin: true               // 伪装请求头，欺骗浏览器，完美解决跨域问题
            }
        }
    }
})