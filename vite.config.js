import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        host: '0.0.0.0',
        strictPort: true,
        port: 3000,
        hmr: {
            host: 'localhost',
            port: 3000,
            protocol: 'ws',
        },
        fs: {
            strict: false,
            allow: ['..']
        },
        proxy: {
            '/api': {
                target: 'http://localhost:5000/',
                changeOrigin: true,
            },
        },
    },
})
