// @ts-ignore
import vercel from 'solid-start-vercel'
import solid from 'solid-start/vite'
import { defineConfig } from 'vite'
import eslint from 'vite-plugin-eslint'

export default defineConfig({
  plugins: [
    solid({
      adapter: vercel(),
    }),
    eslint(),
  ],
})
