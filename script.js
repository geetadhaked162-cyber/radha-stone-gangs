/**
 * Radha Stone Gangsa - Smooth Automated Video Playback on Slight Scroll
 */

const TOTAL_FRAMES = 210;
const FRAME_PREFIX = 'frames/ezgif-frame-';
const FRAME_EXT = '.jpg';

function padZero(num, size = 3) {
  let s = num + '';
  while (s.length < size) s = '0' + s;
  return s;
}

// Elements
const canvas = document.getElementById('stone-canvas');
const ctx = canvas.getContext('2d', { alpha: false });
const introOverlay = document.getElementById('intro-white-overlay');
const mainHeader = document.getElementById('main-header');

// State
const images = [];
const loadedImages = [];
let currentFrame = 1;
let isPlaying = false;
let hasStarted = false;
let playInterval = null;

// 1. Preload images with immediate Frame 1 draw
for (let i = 1; i <= TOTAL_FRAMES; i++) {
  const img = new Image();
  img.src = `${FRAME_PREFIX}${padZero(i)}${FRAME_EXT}`;
  img.onload = () => {
    loadedImages[i] = img;
    if (i === 1 && currentFrame === 1) {
      drawFrame(1);
    }
  };
  images[i] = img;
}

// 2. High-DPI Canvas Sizing
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.scale(dpr, dpr);
  drawFrame(Math.max(1, Math.min(TOTAL_FRAMES, Math.round(currentFrame))));
}
window.addEventListener('resize', resizeCanvas);

// 3. Draw a Frame centered & cover
function drawFrame(idx) {
  let img = loadedImages[idx];
  if (!img) {
    // Find closest available frame if not yet loaded
    for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
      if (idx - offset >= 1 && loadedImages[idx - offset]) {
        img = loadedImages[idx - offset];
        break;
      }
      if (idx + offset <= TOTAL_FRAMES && loadedImages[idx + offset]) {
        img = loadedImages[idx + offset];
        break;
      }
    }
  }

  if (!img || !img.complete) return;

  const w = window.innerWidth;
  const h = window.innerHeight;
  const imgW = img.naturalWidth || 1920;
  const imgH = img.naturalHeight || 1080;

  const scale = Math.max(w / imgW, h / imgH);
  const sw = imgW * scale;
  const sh = imgH * scale;
  const sx = (w - sw) / 2;
  const sy = (h - sh) / 2;

  ctx.drawImage(img, sx, sy, sw, sh);
}

// 4. Start Video Playback
function startVideoPlayback() {
  if (isPlaying) return;

  // Fade out the white "Radha Stone Gangsa" intro overlay
  if (introOverlay) {
    introOverlay.classList.add('fade-out');
  }

  // Switch transparent navbar to video mode (light text on dark video)
  if (mainHeader && window.scrollY < window.innerHeight - 80) {
    mainHeader.classList.add('video-mode');
  }

  hasStarted = true;
  isPlaying = true;

  if (playInterval) clearInterval(playInterval);

  // 30 FPS playback: advances smoothly from 1 to 210
  playInterval = setInterval(() => {
    currentFrame++;

    if (currentFrame > TOTAL_FRAMES) {
      currentFrame = TOTAL_FRAMES;
      clearInterval(playInterval);
      playInterval = null;
      isPlaying = false;
      return;
    }

    drawFrame(currentFrame);
  }, 1000 / 30);
}

// 5. Trigger on ANY slight scroll or interaction
function onSlightInteraction() {
  if (!hasStarted) {
    startVideoPlayback();
  }
}

// Slight scroll trigger (MacBook trackpad wheel, scroll event, touch, or click)
window.addEventListener('wheel', (e) => {
  if (Math.abs(e.deltaY) > 2 || Math.abs(e.deltaX) > 2) {
    onSlightInteraction();
  }
}, { passive: true });

window.addEventListener('scroll', () => {
  if (window.scrollY > 5) {
    onSlightInteraction();
  }

  // Update Transparent Navbar state dynamically based on scroll
  if (mainHeader) {
    const heroThreshold = window.innerHeight - 80;
    if (window.scrollY > heroThreshold) {
      mainHeader.classList.add('scrolled');
      mainHeader.classList.remove('video-mode');
    } else {
      mainHeader.classList.remove('scrolled');
      if (hasStarted) {
        mainHeader.classList.add('video-mode');
      } else {
        mainHeader.classList.remove('video-mode');
      }
    }
  }

  // Reset if scrolled back to top
  if (window.scrollY === 0 && !isPlaying && currentFrame === TOTAL_FRAMES) {
    currentFrame = 1;
    hasStarted = false;
    if (introOverlay) {
      introOverlay.classList.remove('fade-out');
    }
    if (mainHeader) {
      mainHeader.classList.remove('video-mode');
      mainHeader.classList.remove('scrolled');
    }
    drawFrame(1);
  }
}, { passive: true });

window.addEventListener('touchmove', onSlightInteraction, { passive: true });
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown' || e.key === ' ' || e.key === 'PageDown') {
    onSlightInteraction();
  }
});

if (introOverlay) {
  introOverlay.addEventListener('click', onSlightInteraction);
}

// 6. Area Calculator
const roomLength = document.getElementById('room-length');
const roomWidth = document.getElementById('room-width');
const stoneType = document.getElementById('stone-type');
const outNet = document.getElementById('out-net');
const outGross = document.getElementById('out-gross');
const outSlabs = document.getElementById('out-slabs');
const outPrice = document.getElementById('out-price');

function calcStone() {
  if (!roomLength || !roomWidth || !stoneType) return;
  const l = parseFloat(roomLength.value) || 0;
  const w = parseFloat(roomWidth.value) || 0;
  const net = Math.round(l * w);
  const gross = Math.round(net * 1.1);
  const rate = parseFloat(stoneType.value) || 220;
  const slabs = Math.ceil(gross / 50);
  const total = gross * rate;

  if (outNet) outNet.textContent = `${net.toLocaleString()} sq.ft`;
  if (outGross) outGross.textContent = `${gross.toLocaleString()} sq.ft`;
  if (outSlabs) outSlabs.textContent = `~${slabs} Slabs`;
  if (outPrice) outPrice.innerHTML = `&#8377; ${total.toLocaleString('en-IN')}`;
}

[roomLength, roomWidth, stoneType].forEach(el => {
  if (el) el.addEventListener('input', calcStone);
});
calcStone();

// 7. Contact Form
function submitForm(e) {
  e.preventDefault();
  const fb = document.getElementById('form-feedback');
  const btn = document.getElementById('btn-submit');
  btn.textContent = 'Sending...';
  setTimeout(() => {
    btn.textContent = 'Submitted \u2713';
    if (fb) fb.classList.remove('hidden');
  }, 600);
}

// 8. Slab Specimen Front / Back View Switcher
function switchSlabView(view) {
  const img = document.getElementById('slab-display-img');
  const badge = document.getElementById('slab-badge-text');
  const btnFront = document.getElementById('btn-view-front');
  const btnBack = document.getElementById('btn-view-back');

  if (!img) return;

  if (view === 'front') {
    img.src = 'images/slab_front_view.jpg';
    if (badge) badge.textContent = 'फ्रंट व्यू';
    if (btnFront) {
      btnFront.className = 'px-5 py-2 text-xs font-semibold uppercase tracking-wider bg-primary text-on-primary transition-all';
    }
    if (btnBack) {
      btnBack.className = 'px-5 py-2 text-xs font-semibold uppercase tracking-wider bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-all';
    }
  } else {
    img.src = 'images/slab_back_view.jpg';
    if (badge) badge.textContent = 'बैक व्यू';
    if (btnBack) {
      btnBack.className = 'px-5 py-2 text-xs font-semibold uppercase tracking-wider bg-primary text-on-primary transition-all';
    }
    if (btnFront) {
      btnFront.className = 'px-5 py-2 text-xs font-semibold uppercase tracking-wider bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-all';
    }
  }
}

// Initialize Canvas
resizeCanvas();
drawFrame(1);
