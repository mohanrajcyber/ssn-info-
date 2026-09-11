import { cpSync, mkdirSync, rmSync, writeFileSync, existsSync, copyFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const docs = join(root, 'docs')
const assets = join(root, 'assets')
const docsIndex = join(docs, 'index.html')

if (!existsSync(docsIndex)) {
  console.error('docs/index.html missing — build failed?')
  process.exit(1)
}

const html = readFileSync(docsIndex, 'utf8')
writeFileSync(join(docs, '404.html'), html)

if (existsSync(assets)) rmSync(assets, { recursive: true, force: true })
mkdirSync(assets, { recursive: true })
cpSync(join(docs, 'assets'), assets, { recursive: true })
copyFileSync(docsIndex, join(root, 'index.html'))
copyFileSync(join(docs, '404.html'), join(root, '404.html'))
writeFileSync(join(root, '.nojekyll'), '')
console.log('Published docs/ → repo root for GitHub Pages (main / root)')
