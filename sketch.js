let video
let audio

function setup() {
  createCanvas(400, 400);
  video = createCapture(VIDEO);
  video.size(400, 400);
  video.hide();

  audio = new p5.AudioIn();
  audio.start();
}

function draw() {
  background(220);
  let volume = audio.getLevel();
  let size = map(volume, 0, 1, 10, 200);
  circle(200, 200, size);

  let threshold = map(volume, 0, 0.005, 0, 1);
  image(video, 0, 0);
  filter(THRESHOLD, threshold);
}
