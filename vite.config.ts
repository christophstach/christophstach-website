// @ts-ignore
import vercel from 'solid-start-vercel'
import solid from 'solid-start/vite'
import { defineConfig } from 'vite'

export const config = {
  runtime: 'experimental-edge',
}

export default defineConfig({
  plugins: [
    solid({
      adapter: vercel(),
    }),
  ],
})
