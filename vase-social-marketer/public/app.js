// Vase Social Marketer - Frontend Application with Canvas
// Enhanced backgrounds based on photo-template-objective.md

const API_BASE = '';

let selectedBackground = 'luxury-outdoor';
let selectedVase = 'vase-ceramic-white';
let selectedAudience = 'general';
let backgrounds = [];
let vases = [];

const vaseSelect = document.getElementById('vaseSelect');
const backgroundGrid = document.getElementById('backgroundGrid');
const audienceButtons = document.querySelectorAll('.audience-btn');
const customMessage = document.getElementById('customMessage');
const generateBtn = document.getElementById('generateBtn');
const previewImage = document.getElementById('previewImage');
const placeholder = document.getElementById('placeholder');
const copyOutput = document.getElementById('copyOutput');
const copyText = document.getElementById('copyText');
const copyBtn = document.getElementById('copyBtn');

async function init() {
  await loadBackgrounds();
  await loadVases();
  setupEventListeners();
}

async function loadBackgrounds() {
  try {
    const response = await fetch(`${API_BASE}/api/backgrounds`);
    backgrounds = await response.json();

    backgroundGrid.innerHTML = '';
    backgrounds.forEach(bg => {
      const div = document.createElement('div');
      div.className = `background-option ${bg.id === selectedBackground ? 'selected' : ''} ${bg.id}`;
      div.dataset.id = bg.id;
      div.style.background = getBackgroundPreviewStyle(bg);
      div.addEventListener('click', () => selectBackground(bg.id));
      backgroundGrid.appendChild(div);
    });
  } catch (error) {
    console.error('Error loading backgrounds:', error);
    backgroundGrid.innerHTML = '<p>Error loading backgrounds</p>';
  }
}

function getBackgroundPreviewStyle(bg) {
  if (bg.colors && bg.colors.length > 1) {
    return `linear-gradient(135deg, ${bg.colors[0]}, ${bg.colors[1]})`;
  } else if (bg.colors && bg.colors.length === 1) {
    return bg.colors[0];
  }
  return '#f5f5f5';
}

async function loadVases() {
  try {
    const response = await fetch(`${API_BASE}/api/vases`);
    vases = await response.json();

    vaseSelect.innerHTML = vases.map(vase =>
      `<option value="${vase.id}" ${vase.id === selectedVase ? 'selected' : ''}>${vase.name}</option>`
    ).join('');
  } catch (error) {
    console.error('Error loading vases:', error);
    vaseSelect.innerHTML = '<option>Error loading vases</option>';
  }
}

function setupEventListeners() {
  vaseSelect.addEventListener('change', (e) => {
    selectedVase = e.target.value;
  });

  audienceButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      audienceButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedAudience = btn.dataset.audience;
    });
  });

  generateBtn.addEventListener('click', generatePost);
  copyBtn.addEventListener('click', copyToClipboard);
}

function selectBackground(id) {
  selectedBackground = id;
  document.querySelectorAll('.background-option').forEach(opt => {
    opt.classList.toggle('selected', opt.dataset.id === id);
  });
}

// ============ ENHANCED BACKGROUND RENDERERS ============

// Draw vase shape on canvas with luxury quality
function drawVase(ctx, x, y, width, height, isTransparent = false) {
  const centerX = x + width / 2;
  const topY = y + height * 0.12;
  const bottomY = y + height * 0.88;

  ctx.save();

  // Glass/ceramic effect gradient
  let gradient;
  if (isTransparent) {
    gradient = ctx.createLinearGradient(x, y, x + width, y);
    gradient.addColorStop(0, 'rgba(200, 210, 220, 0.7)');
    gradient.addColorStop(0.3, 'rgba(230, 235, 240, 0.8)');
    gradient.addColorStop(0.5, 'rgba(250, 252, 255, 0.85)');
    gradient.addColorStop(0.7, 'rgba(230, 235, 240, 0.8)');
    gradient.addColorStop(1, 'rgba(180, 190, 200, 0.7)');
  } else {
    gradient = ctx.createLinearGradient(x, y, x + width, y);
    gradient.addColorStop(0, '#E8D5C4');
    gradient.addColorStop(0.3, '#F5EDE4');
    gradient.addColorStop(0.5, '#FAF7F2');
    gradient.addColorStop(0.7, '#F5EDE4');
    gradient.addColorStop(1, '#D4C4B0');
  }

  // Vase body
  ctx.beginPath();
  const neckHeight = height * 0.12;
  const neckWidth = width * 0.22;
  const maxBodyWidth = width * 0.8;

  // Neck
  ctx.moveTo(centerX - neckWidth, y + height * 0.05);
  ctx.lineTo(centerX + neckWidth, y + height * 0.05);
  ctx.quadraticCurveTo(centerX + neckWidth * 0.9, topY, centerX + neckWidth * 0.75, topY);
  ctx.lineTo(centerX - neckWidth * 0.75, topY);
  ctx.quadraticCurveTo(centerX - neckWidth * 0.9, topY, centerX - neckWidth, y + height * 0.05);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Body
  ctx.beginPath();
  ctx.moveTo(centerX - neckWidth * 0.75, topY);
  ctx.bezierCurveTo(
    centerX - maxBodyWidth, topY + height * 0.15,
    centerX - maxBodyWidth * 0.9, bottomY - height * 0.1,
    centerX - maxBodyWidth * 0.55, bottomY
  );
  ctx.lineTo(centerX + maxBodyWidth * 0.55, bottomY);
  ctx.bezierCurveTo(
    centerX + maxBodyWidth * 0.9, bottomY - height * 0.1,
    centerX + maxBodyWidth, topY + height * 0.15,
    centerX + neckWidth * 0.75, topY
  );
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Glass highlight/reflection
  ctx.beginPath();
  const hlX = centerX - width * 0.18;
  const hlY = y + height * 0.25;
  const hlW = width * 0.1;
  const hlH = height * 0.35;
  ctx.ellipse(hlX, hlY, hlW, hlH, -0.2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fill();

  // Bottom highlight
  ctx.beginPath();
  ctx.ellipse(centerX - width * 0.15, bottomY - height * 0.08, width * 0.12, height * 0.04, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.fill();

  // Outline for non-transparent
  if (!isTransparent) {
    ctx.strokeStyle = '#B8A99A';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

// Transparent PNG background
function drawTransparentBackground(ctx, width, height) {
  // Just clear - transparent
  ctx.clearRect(0, 0, width, height);
}

// White studio background
function drawWhiteStudio(ctx, width, height) {
  // Clean white with subtle gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.5, '#fafafa');
  gradient.addColorStop(1, '#f0f0f0');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Subtle shadow underneath vase area
  const centerX = width / 2;
  const centerY = height / 2 + height * 0.25;
  const shadowGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, width * 0.4);
  shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.15)');
  shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shadowGradient;
  ctx.fillRect(0, 0, width, height);
}

// Luxury lifestyle scene - Texas Hill Country outdoor dinner
function drawLuxuryOutdoor(ctx, width, height) {
  // Sky - golden hour gradient
  const skyGradient = ctx.createLinearGradient(0, 0, 0, height * 0.6);
  skyGradient.addColorStop(0, '#FF9966');
  skyGradient.addColorStop(0.3, '#FF5E62');
  skyGradient.addColorStop(0.6, '#C44569');
  skyGradient.addColorStop(1, '#6B2C5B');
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, height * 0.6);

  // Sun glow
  const sunGradient = ctx.createRadialGradient(width * 0.7, height * 0.35, 0, width * 0.7, height * 0.35, width * 0.4);
  sunGradient.addColorStop(0, 'rgba(255, 200, 100, 0.8)');
  sunGradient.addColorStop(0.5, 'rgba(255, 150, 50, 0.3)');
  sunGradient.addColorStop(1, 'rgba(255, 100, 50, 0)');
  ctx.fillStyle = sunGradient;
  ctx.fillRect(0, 0, width, height);

  // Distant hills/landscape
  ctx.fillStyle = '#3D2914';
  ctx.beginPath();
  ctx.moveTo(0, height * 0.55);
  ctx.bezierCurveTo(width * 0.2, height * 0.45, width * 0.4, height * 0.52, width * 0.5, height * 0.5);
  ctx.bezierCurveTo(width * 0.7, height * 0.48, width * 0.9, height * 0.55, width, height * 0.52);
  ctx.lineTo(width, height * 0.6);
  ctx.lineTo(0, height * 0.6);
  ctx.closePath();
  ctx.fill();

  // Table
  ctx.fillStyle = '#F5F5F5';
  ctx.fillRect(width * 0.15, height * 0.65, width * 0.7, height * 0.35);

  // Tablecloth shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.fillRect(width * 0.15, height * 0.65 + height * 0.33, width * 0.7, height * 0.02);

  // Wine glass silhouettes
  const glassX = width * 0.55;
  const glassY = height * 0.62;
  
  // Glass stem
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(glassX, glassY + 30);
  ctx.lineTo(glassX, glassY + 60);
  ctx.moveTo(glassX - 15, glassY + 60);
  ctx.lineTo(glassX + 15, glassY + 60);
  ctx.stroke();

  // Glass bowl
  ctx.beginPath();
  ctx.ellipse(glassX, glassY + 15, 12, 18, 0, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Candle
  const candleX = width * 0.35;
  const candleY = height * 0.6;
  ctx.fillStyle = '#F0E6D3';
  ctx.fillRect(candleX - 5, candleY, 10, 40);
  
  // Candle flame glow
  const flameGradient = ctx.createRadialGradient(candleX, candleY - 5, 0, candleX, candleY - 5, 30);
  flameGradient.addColorStop(0, 'rgba(255, 200, 100, 0.9)');
  flameGradient.addColorStop(0.3, 'rgba(255, 150, 50, 0.5)');
  flameGradient.addColorStop(1, 'rgba(255, 100, 50, 0)');
  ctx.fillStyle = flameGradient;
  ctx.beginPath();
  ctx.arc(candleX, candleY - 5, 25, 0, Math.PI * 2);
  ctx.fill();

  // Ambient lighting overlay
  ctx.fillStyle = 'rgba(255, 180, 100, 0.1)';
  ctx.fillRect(0, 0, width, height);
}

// Modern kitchen interior
function drawModernKitchen(ctx, width, height) {
  // Wall
  ctx.fillStyle = '#E8E4DF';
  ctx.fillRect(0, 0, width, height * 0.55);

  // Counter
  ctx.fillStyle = '#D4C8C0';
  ctx.fillRect(0, height * 0.55, width, height * 0.25);

  // Counter edge
  ctx.fillStyle = '#C4B8AC';
  ctx.fillRect(0, height * 0.55, width, 8);

  // Cabinet lines
  ctx.strokeStyle = '#B0A8A0';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    ctx.strokeRect(width * 0.1 + i * width * 0.22, height * 0.2, width * 0.2, height * 0.3);
  }

  // Window
  ctx.fillStyle = '#87CEEB';
  ctx.fillRect(width * 0.6, height * 0.15, width * 0.3, height * 0.35);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 4;
  ctx.strokeRect(width * 0.6, height * 0.15, width * 0.3, height * 0.35);
  // Window cross
  ctx.beginPath();
  ctx.moveTo(width * 0.75, height * 0.15);
  ctx.lineTo(width * 0.75, height * 0.5);
  ctx.moveTo(width * 0.6, height * 0.325);
  ctx.lineTo(width * 0.9, height * 0.325);
  ctx.stroke();

  // Shelf with items
  ctx.fillStyle = '#A09080';
  ctx.fillRect(width * 0.1, height * 0.52, width * 0.8, 4);

  // Ambient
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fillRect(0, 0, width, height);
}

// Romantic outdoor dinner (similar to luxury but more intimate)
function drawRomanticDinner(ctx, width, height) {
  // Deep twilight sky
  const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
  skyGradient.addColorStop(0, '#1a1a2e');
  skyGradient.addColorStop(0.4, '#4a3f6b');
  skyGradient.addColorStop(0.7, '#9b6b7a');
  skyGradient.addColorStop(1, '#e8a87c');
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, width, height);

  // Stars
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  for (let i = 0; i < 30; i++) {
    const sx = Math.random() * width;
    const sy = Math.random() * height * 0.5;
    const sr = Math.random() * 1.5 + 0.5;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Table
  ctx.fillStyle = '#2D2D2D';
  ctx.fillRect(width * 0.2, height * 0.7, width * 0.6, height * 0.3);

  // Plates
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.ellipse(width * 0.35, height * 0.78, 30, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(width * 0.65, height * 0.78, 30, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wine bottle
  ctx.fillStyle = '#722F37';
  ctx.fillRect(width * 0.45, height * 0.68, 20, 50);
  ctx.fillStyle = '#8B0000';
  ctx.fillRect(width * 0.47, height * 0.66, 16, 8);

  // Candles
  for (let i = 0; i < 3; i++) {
    const cx = width * 0.3 + i * width * 0.2;
    const cy = height * 0.72;
    ctx.fillStyle = '#F5E6D3';
    ctx.fillRect(cx - 3, cy, 6, 25);
    
    // Flame
    const fg = ctx.createRadialGradient(cx, cy - 5, 0, cx, cy - 5, 20);
    fg.addColorStop(0, 'rgba(255, 200, 100, 0.8)');
    fg.addColorStop(1, 'rgba(255, 100, 50, 0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(cx, cy - 5, 15, 0, Math.PI * 2);
    ctx.fill();
  }

  // Warm overlay
  ctx.fillStyle = 'rgba(255, 180, 80, 0.08)';
  ctx.fillRect(0, 0, width, height);
}

// Minimalist luxury catalog
function drawMinimalistCatalog(ctx, width, height) {
  // Soft gray gradient
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#F8F8F8');
  gradient.addColorStop(0.5, '#EFEFEF');
  gradient.addColorStop(1, '#E8E8E8');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Subtle circle accent
  ctx.fillStyle = 'rgba(200, 180, 160, 0.15)';
  ctx.beginPath();
  ctx.arc(width * 0.5, height * 0.5, width * 0.35, 0, Math.PI * 2);
  ctx.fill();

  // Soft shadow area
  const shadowGradient = ctx.createRadialGradient(width * 0.5, height * 0.55, 0, width * 0.5, height * 0.55, width * 0.4);
  shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.08)');
  shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shadowGradient;
  ctx.fillRect(0, 0, width, height);
}

// Main composite function
function createCompositeImage(bgConfig, canvasWidth, canvasHeight) {
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');

  // Route to appropriate background renderer
  switch (bgConfig.id) {
    case 'transparent':
      drawTransparentBackground(ctx, canvasWidth, canvasHeight);
      break;
    case 'white-studio':
      drawWhiteStudio(ctx, canvasWidth, canvasHeight);
      break;
    case 'luxury-outdoor':
      drawLuxuryOutdoor(ctx, canvasWidth, canvasHeight);
      break;
    case 'modern-kitchen':
      drawModernKitchen(ctx, canvasWidth, canvasHeight);
      break;
    case 'romantic-dinner':
      drawRomanticDinner(ctx, canvasWidth, canvasHeight);
      break;
    case 'minimalist-catalog':
      drawMinimalistCatalog(ctx, canvasWidth, canvasHeight);
      break;
    default:
      drawMinimalistCatalog(ctx, canvasWidth, canvasHeight);
  }

  // Draw vase on top
  const vaseWidth = canvasWidth * 0.4;
  const vaseHeight = canvasHeight * 0.55;
  const vaseX = (canvasWidth - vaseWidth) / 2;
  const vaseY = (canvasHeight - vaseHeight) / 2;

  const isTransparent = bgConfig.id === 'transparent';
  drawVase(ctx, vaseX, vaseY, vaseWidth, vaseHeight, isTransparent);

  return canvas.toDataURL('image/png');
}

// Generate post
async function generatePost() {
  if (!selectedVase || !selectedBackground) {
    alert('Please select a vase and background');
    return;
  }

  generateBtn.disabled = true;
  generateBtn.textContent = '⏳ Generating...';

  try {
    const bgConfig = backgrounds.find(b => b.id === selectedBackground);
    const imageDataUrl = createCompositeImage(bgConfig, 800, 800);

    const response = await fetch(`${API_BASE}/api/generate-post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        backgroundId: selectedBackground,
        vaseId: selectedVase,
        audience: selectedAudience,
        customMessage: customMessage.value || null
      })
    });

    const result = await response.json();

    if (result.success) {
      previewImage.src = imageDataUrl;
      previewImage.style.display = 'block';
      placeholder.style.display = 'none';

      copyText.textContent = result.copy.fullPost;
      copyOutput.style.display = 'block';
    } else {
      alert('Error generating post: ' + result.error);
    }
  } catch (error) {
    console.error('Error generating post:', error);
    alert('Error generating post. Please try again.');
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = '🚀 Generate Post';
  }
}

async function copyToClipboard() {
  const text = copyText.textContent;
  try {
    await navigator.clipboard.writeText(text);
    copyBtn.textContent = '✅ Copied!';
    setTimeout(() => {
      copyBtn.textContent = '📋 Copy to Clipboard';
    }, 2000);
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    alert('Failed to copy. Please select and copy manually.');
  }
}

init();
