let video;
let audio;
let fft;
let pixelBuffer;
let freezeLayer;
let smoothedVolume = 0;
let previousPixels = null;
let previousW = 0;
let previousH = 0;

const HIGH_VOLUME_THRESHOLD = 0.008;
const MOTION_THRESHOLD = 32;

function setup() {
  createCanvas(500, 400);
  pixelDensity(1);

  video = createCapture(VIDEO);
  video.size(500, 400);
  video.hide();

  pixelBuffer = createGraphics(64, 51);
  pixelBuffer.pixelDensity(1);

  freezeLayer = createGraphics(width, height);
  freezeLayer.clear();

  audio = new p5.AudioIn();
  audio.start();

  // FFT
  fft = new p5.FFT();
  fft.setInput(audio);
}

function draw() {
  let rawVolume = audio.getLevel();
  smoothedVolume = lerp(smoothedVolume, rawVolume, 0.2);
  let volume = smoothedVolume;

  image(video, 0, 0);

  fft.analyze();

  let bass = fft.getEnergy("bass");     // 20–250Hz
  let mids = fft.getEnergy("mid");      // 250–2000Hz
  let highs = fft.getEnergy("treble");  // 2000–20000Hz

  // Calcolo tono dal mix
  let total = bass + mids + highs;
  if (total === 0) total = 1;

  // Bassi = rosso, medi = verde, alti = blu
  let tone = (bass * 0 + mids * 120 + highs * 240) / total;

  // Mappatura colore
  tone = map(tone, 0, 120, 0, 360);

  let pixelMix = map(volume, 0.001, 0.08, 0, 1, true);

  if (volume < 0.001) {
    image(freezeLayer, 0, 0);

    if (getAudioContext().state !== "running") {
      fill(255);
      noStroke();
      textSize(14);
      textAlign(CENTER, CENTER);
      text("Click per attivare il microfono", width / 2, height - 24);
    }

    return;
  }

  drawPixelExplosion(video, tone, volume, bass, pixelMix);
  image(freezeLayer, 0, 0);
}

function drawPixelExplosion(sourceImg, tone, volume, bass, pixelMix) {
  let lowResW = floor(map(pixelMix, 0, 1, 120, 14, true));
  let lowResH = floor((lowResW * height) / width);
  let cellW = width / lowResW;
  let cellH = height / lowResH;

  pixelBuffer.resizeCanvas(lowResW, lowResH);
  pixelBuffer.image(sourceImg, 0, 0, lowResW, lowResH);
  pixelBuffer.loadPixels();

  let canDetectMotion = previousPixels && previousW === lowResW && previousH === lowResH;

  // Mosaico colorato esplicito: evita problemi di tint/blend e garantisce colori visibili.
  let bassNorm = constrain(bass / 255, 0, 1);
  let pulse = (sin(frameCount * 0.55) * 0.5 + 0.5) * bassNorm;
  let alphaBase = map(pixelMix, 0, 1, 20, 100, true);

  push();
  colorMode(HSB, 360, 100, 100, 100);
  noStroke();

  for (let y = 0; y < lowResH; y++) {
    for (let x = 0; x < lowResW; x++) {
      let idx = 4 * (x + y * lowResW);
      let r = pixelBuffer.pixels[idx];
      let g = pixelBuffer.pixels[idx + 1];
      let b = pixelBuffer.pixels[idx + 2];

      let luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      let h = (tone + map(x, 0, lowResW, -45, 45) + pulse * 120) % 360;
      if (h < 0) h += 360;
      let s = map(luminance, 0, 1, 95, 65, true);
      let br = map(luminance, 0, 1, 35, 100, true);
      let a = alphaBase;

      fill(h, s, br, a);
      rect(x * cellW, y * cellH, cellW + 1, cellH + 1);

      if (canDetectMotion) {
        let pr = previousPixels[idx];
        let pg = previousPixels[idx + 1];
        let pb = previousPixels[idx + 2];
        let motion = (abs(r - pr) + abs(g - pg) + abs(b - pb)) / 3;

        if (motion > MOTION_THRESHOLD && pixelMix > 0.15) {
          freezeLayer.push();
          freezeLayer.colorMode(HSB, 360, 100, 100, 100);
          freezeLayer.noStroke();
          freezeLayer.fill(h, s, br, 90);
          freezeLayer.rect(x * cellW, y * cellH, cellW + 1, cellH + 1);
          freezeLayer.pop();
        }
      }
    }
  }

  // Flash ritmico sui bassi per enfatizzare i picchi.
  let flashAlpha = map(pulse, 0, 1, 0, 40, true);
  blendMode(ADD);
  fill((tone + 35) % 360, 100, 100, flashAlpha);
  rect(0, 0, width, height);
  pop();

  previousPixels = new Uint8ClampedArray(pixelBuffer.pixels);
  previousW = lowResW;
  previousH = lowResH;
}


// COLOR KEY
function colorKey(videoFeed, targetHue, hueRange, satRange, brightRange, feather) {
  let imgCopy = videoFeed.get();
  imgCopy.loadPixels();

  for (let i = 0; i < imgCopy.pixels.length; i += 4) {

    let r = imgCopy.pixels[i];
    let g = imgCopy.pixels[i + 1];
    let b = imgCopy.pixels[i + 2];

    let hsb = rgbToHsb(r, g, b);

    // Hue circolare
    let hueDiff = abs(hsb.h - targetHue);
    hueDiff = min(hueDiff, 360 - hueDiff);

    // Controlli
    let hueMatch = hueDiff < hueRange;
    let satMatch = abs(hsb.s - satRange.target) < satRange.range;
    let brightMatch = abs(hsb.b - brightRange.target) < brightRange.range;

    // Se non matcha → trasparente
    if (!(hueMatch && satMatch && brightMatch)) {
      let alpha = map(hueDiff, hueRange, hueRange + feather, 255, 0, true);
      imgCopy.pixels[i + 3] = alpha;
    }
  }

  imgCopy.updatePixels();
  return imgCopy;
}


// RGB → HSB
function rgbToHsb(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;

  let max = Math.max(r, g, b);
  let min = Math.min(r, g, b);

  let h, s;
  let bright = max;

  let d = max - min;
  s = max === 0 ? 0 : d / max;

  if (max === min) {
    h = 0;
  } else {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: h * 360,
    s: s * 100,
    b: bright * 100
  };
}


function keyPressed() {
  if (key === 's') {
    saveCanvas('myCanvas', 'png');
  }

  if (key === 'c' || key === 'C') {
    freezeLayer.clear();
  }
}

function mousePressed() {
  unlockAudio();
}

function touchStarted() {
  unlockAudio();
  return false;
}

function unlockAudio() {
  userStartAudio();
  audio.start();
}