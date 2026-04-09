let video;
let audio;

function setup() {
  createCanvas(500, 400);
  video = createCapture(VIDEO);
  video.size(500, 400);
  video.hide();

  audio = new p5.AudioIn();
  audio.start();
}

function draw() {
  let volume = audio.getLevel();
  // console.log(volume);
  colorKey(video, 255, 0, 0, 200); // Mantieni solo i pixel rossi con una tolleranza di 200
  image(video, 0, 0, 500, 400);
  
}

// Funzione colorKey: mantiene i pixel di un colore specifico e scarta gli altri
// targetR, targetG, targetB: il colore da mantenere (0-255 per ogni canale)
// threshold: tolleranza della somiglianza al colore (0-255, valori più alti = più permissivi)
function colorKey(videoFeed, targetR, targetG, targetB, threshold) {
  videoFeed.loadPixels();
  
  for (let i = 0; i < videoFeed.pixels.length; i += 4) {
    let r = videoFeed.pixels[i];     // canale rosso
    let g = videoFeed.pixels[i + 1]; // canale verde
    let b = videoFeed.pixels[i + 2]; // canale blu
    
    // Calcola la distanza euclidea dal colore target
    let distance = sqrt(
      pow(r - targetR, 2) + 
      pow(g - targetG, 2) + 
      pow(b - targetB, 2)
    );
    
    // Se la distanza è maggiore del threshold, rendi il pixel trasparente
    if (distance > threshold) {
      videoFeed.pixels[i + 3] = 0; // alpha = 0 (trasparente)
    }
  }
  
  videoFeed.updatePixels();
}