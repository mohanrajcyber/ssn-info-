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

let html = readFileSync(docsIndex, 'utf8')
// Absolute /ssn-info-/ paths — phone often opens WITHOUT trailing slash;
// relative ./assets then resolves to github.io/assets (404).
html = html
  .replaceAll('/ssn-info-/assets/app.js', '/ssn-info-/assets/app.js?v=6')
  .replaceAll('/ssn-info-/assets/app.css', '/ssn-info-/assets/app.css?v=6')
  .replaceAll('crossorigin', '')

writeFileSync(docsIndex, html)
writeFileSync(join(docs, '404.html'), html)

if (existsSync(assets)) rmSync(assets, { recursive: true, force: true })
mkdirSync(assets, { recursive: true })
cpSync(join(docs, 'assets'), assets, { recursive: true })
copyFileSync(docsIndex, join(root, 'index.html'))
copyFileSync(join(docs, '404.html'), join(root, '404.html'))
writeFileSync(join(root, '.nojekyll'), '')
console.log('Published docs/ → repo root (stable app.js + absolute /ssn-info-/ URLs)')
