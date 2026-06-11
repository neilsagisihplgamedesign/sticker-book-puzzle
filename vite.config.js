import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

function normalizeIterationMode(value) {
  const modes = new Set(['10clk', '60sec', 'full'])
  return modes.has(value) ? value : null
}

const iterationMode = process.env.PLAYABLE_ITERATION
  ? normalizeIterationMode(process.env.PLAYABLE_ITERATION)
  : null

export default defineConfig({
  plugins: [viteSingleFile()],
  define: {
    'globalThis.__ITERATION_MODE__': JSON.stringify(iterationMode),
  },
  build: {
    modulePreload: false,
    rollupOptions: {
      output: {
        format: 'iife',
      },
    },
  },
  esbuild: {
    pure: ['console.error'],
  },
})
