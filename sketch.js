let video;
let audio;
let fft;

function setup() {
  createCanvas(500, 400);
  video = createCapture(VIDEO);
  video.size(500, 400);
  video.hide();
  
  audio = new p5.AudioIn();
  audio.start();
  
  // FFT 
  fft = new p5.FFT();
  fft.setInput(audio);
}


function draw() {
  let volume = audio.getLevel();
  // console.log(volume);
   
  fft.analyze();
  
  let bass = fft.getEnergy("bass");      // Basse frequenze (20-250Hz)
  let mids = fft.getEnergy("mid");       // Frequenze medie (250-2000Hz)
  let highs = fft.getEnergy("treble");   // Alte frequenze (2000-20000Hz)

  // Calcola il tono del suono basato sul mix di frequenze
  // Bassi = Rosso (0°), Medi = Verde (120°), Alti = Blu (240°)
  let total = bass + mids + highs;
  
  if(total === 0) {
    total = 1; // Evita divisione per zero
  }


  let tone = (bass * 0 + mids * 120 + highs * 240) / total;

 

  tone = map (tone, 0, 120, 0, 360); // Mappa il tono da 0-255 a 0-360 gradi
 console.log(tone);
 
  let keyedVideo = colorKey(video, tone, 30, 80, 30);

  if(volume < 0.001) {
    return;
  }

  image(keyedVideo, 0, 0);
}

// Funzione colorKey HSB: mantiene i pixel del colore specificato (in HSB), scarta gli altri
function colorKey(videoFeed, h, s, b, threshold) {
  // Ottiene un'immagine dal video frame
  let imgCopy = videoFeed.get();
  
  // Carica i pixel dell'immagine
  imgCopy.loadPixels();
  
  // Itera su tutti i pixel
  for (let i = 0; i < imgCopy.pixels.length; i += 4) {
    // Estrae i valori RGB del pixel corrente
    let pixelR = imgCopy.pixels[i];
    let pixelG = imgCopy.pixels[i + 1];
    let pixelB = imgCopy.pixels[i + 2];
    
    // Converte il pixel da RGB a HSB
    let pixelHSB = rgbToHsb(pixelR, pixelG, pixelB);
    
    // Calcola la distanza della tonalità (Hue) dal colore target
    let hueDifference = abs(pixelHSB.h - h);
    // Considera la distanza minore tra senso orario e antiorario
    hueDifference = min(hueDifference, 360 - hueDifference);
    
    // Calcola la distanza di saturation e brightness
    let satDifference = abs(pixelHSB.s - s);
    let brightDifference = abs(pixelHSB.b - b);
    
    // Calcola la distanza totale euclidea nello spazio HSB
    // Normalizza Hue a 0-100 per coerenza con Saturation e Brightness
    let hueNormalized = hueDifference / 3.6; // 360 / 100
    let totalDistance = sqrt(hueNormalized * hueNormalized + 
                             satDifference * satDifference + 
                             brightDifference * brightDifference);
    
    // Se la distanza è maggiore del threshold, rende il pixel trasparente
    if (totalDistance > threshold) {
      imgCopy.pixels[i + 3] = 0; // Alpha = 0 (trasparente)
    }
  }
  
  imgCopy.updatePixels();
  return imgCopy;
}

// Funzione per convertire RGB a HSB
function rgbToHsb(r, g, b) {
  r = r / 255;
  g = g / 255;
  b = b / 255;
  
  let max = Math.max(r, g, b);
  let min = Math.min(r, g, b);
  let h, s, bright = max;
  
  let d = max - min;
  s = max === 0 ? 0 : d / max;
  
  if (max === min) {
    h = 0;
  } else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  
  // Ritorna i valori HSB normalizzati 0-255 (come p5.js)
  return {
    h: h * 360,        // Hue 0-360
    s: s * 100,        // Saturation 0-100
    b: bright * 100    // Brightness 0-100
  };
}

function keyPressed(){
  if(key === 's'){
    saveCanvas('myCanvas', 'png');
  }
}