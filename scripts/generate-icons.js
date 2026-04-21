// scripts/generate-icons.js
// Run with: node scripts/generate-icons.js
// Requires: npm install canvas

const { createCanvas } = require('canvas')
const fs = require('fs')
const path = require('path')

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512]
const OUT_DIR = path.join(__dirname, '../public/icons')

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

function generateIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Background
  const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2)
  grad.addColorStop(0, '#1C1C27')
  grad.addColorStop(1, '#0F0F14')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.roundRect(0, 0, size, size, size * 0.22)
  ctx.fill()

  // Accent ring
  ctx.strokeStyle = '#FF6B3540'
  ctx.lineWidth = size * 0.03
  ctx.beginPath()
  ctx.roundRect(size*0.04, size*0.04, size*0.92, size*0.92, size * 0.18)
  ctx.stroke()

  // Emoji
  ctx.font = `${size * 0.52}px serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('🏡', size / 2, size / 2 + size * 0.03)

  const buffer = canvas.toBuffer('image/png')
  fs.writeFileSync(path.join(OUT_DIR, `icon-${size}.png`), buffer)
  console.log(`✓ icon-${size}.png`)
}

SIZES.forEach(generateIcon)
console.log('\n✅ Tots els icones generats a public/icons/')
console.log('   Si no tens "canvas" instal·lat: npm install canvas --save-dev')
