// Script pour créer les icônes PNG
// Nécessite canvas: npm install canvas

const fs = require('fs');
const { createCanvas } = require('canvas');

function drawIcon(ctx, size) {
  // Gradient background
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#6366f1');
  grad.addColorStop(1, '#818cf8');

  // Rounded rect
  const radius = size * 0.2;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Outer circle
  ctx.beginPath();
  ctx.arc(size/2, size/2, size * 0.23, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = size * 0.04;
  ctx.stroke();

  // Inner circle
  ctx.beginPath();
  ctx.arc(size/2, size/2, size * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fill();

  // Rays
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = size * 0.025;
  ctx.lineCap = 'round';

  const rayLength = size * 0.07;
  const rayDist = size * 0.32;

  [[0,-1],[0,1],[-1,0],[1,0]].forEach(([dx, dy]) => {
    ctx.beginPath();
    ctx.moveTo(size/2 + dx * rayDist, size/2 + dy * rayDist);
    ctx.lineTo(size/2 + dx * (rayDist + rayLength), size/2 + dy * (rayDist + rayLength));
    ctx.stroke();
  });
}

// Générer les deux tailles
[192, 512].forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  drawIcon(ctx, size);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`icon-${size}.png`, buffer);
  console.log(`icon-${size}.png créé`);
});
