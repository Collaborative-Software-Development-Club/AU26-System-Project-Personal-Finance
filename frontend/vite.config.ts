import path from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

/**
 * lucide-react's main entry does `import * as icons from './icons/index.mjs'`
 * and re-exports every glyph. Vite 8's Rolldown optimizer then pre-bundles
 * ~1800 modules and can sit on "bundling dependencies…" for minutes.
 * Rewrite named imports to the individual icon files instead.
 */
function lucideReactUnbarrel(): Plugin {
  return {
    name: 'lucide-react-unbarrel',
    enforce: 'pre',
    transform(code, id) {
      if (id.includes(`${path.sep}node_modules${path.sep}`)) return
      if (!code.includes('lucide-react')) return
      const importRe = /import\s+(type\s+)?\{([^}]+)\}\s+from\s+['"]lucide-react['"]/g

      const next = code.replace(importRe, (full, typeKw: string | undefined, spec: string) => {
        if (typeKw) return full
        const value: string[] = []
        const types: string[] = []
        for (const raw of spec.split(',')) {
          const part = raw.trim()
          if (!part) continue
          if (part.startsWith('type ')) types.push(part.slice(5).trim())
          else value.push(part)
        }
        const lines = value.map((part) => {
          const [orig, alias] = part.split(/\s+as\s+/).map((s) => s.trim())
          const file = lucideFileName(orig)
          const binding = alias || orig
          return `import ${binding} from 'lucide-react/dist/esm/icons/${file}'`
        })
        if (types.length) lines.push(`import type { ${types.join(', ')} } from 'lucide-react'`)
        return lines.join('\n')
      })
      return next === code ? undefined : next
    },
  }
}

function lucideFileName(exportName: string): string {
  let name = exportName
  if (name.startsWith('Lucide') && name.length > 6) name = name.slice(6)
  if (name.endsWith('Icon') && name.length > 4) name = name.slice(0, -4)
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-zA-Z])(\d)/g, '$1-$2')
    .toLowerCase()
}

export default defineConfig({
  plugins: [lucideReactUnbarrel(), react(), tailwindcss()],
  server: {
    proxy: { '/api': { target: 'http://localhost:8000', rewrite: (p) => p.replace(/^\/api/, '') } },
  },
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src'),
    },
  },
  optimizeDeps: {
    // Never pre-bundle the lucide barrel; the plugin above points at per-icon files.
    exclude: ['lucide-react'],
    include: [
      'react',
      'react-dom',
      'react-router',
      'zustand',
      'zustand/react/shallow',
      'sonner',
      'cn',
      'class-variance-authority',
      'radix-ui',
      'recharts',
      'date-fns',
      'papaparse',
    ],
  },
})
