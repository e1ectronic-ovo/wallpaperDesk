import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const svgPath = path.join(root, 'resources', 'icon.svg')
const pngPath = path.join(root, 'resources', 'icon.png')

if (!fs.existsSync(svgPath)) {
  console.error('缺少 resources/icon.svg')
  process.exit(1)
}

const svg = fs.readFileSync(svgPath)
await sharp(svg, { density: 300 })
  .resize(256, 256)
  .png()
  .toFile(pngPath)

console.log('已生成 resources/icon.png')
