/**
 * Microphone tap: mono float input at the context rate → 16 kHz PCM16 in 20 ms frames (320
 * samples), posted to the page. Resampling averages the input samples that fall into each
 * output sample, which is enough for speech recognition.
 */
class PetMic extends AudioWorkletProcessor {
  constructor() {
    super();
    this.step = sampleRate / 16000;
    this.acc = 0;
    this.sum = 0;
    this.n = 0;
    this.frame = new Int16Array(320);
    this.at = 0;
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) {
      this.sum += ch[i]; this.n++; this.acc += 1;
      if (this.acc >= this.step) {
        this.acc -= this.step;
        const v = Math.max(-1, Math.min(1, this.sum / this.n));
        this.sum = 0; this.n = 0;
        this.frame[this.at++] = v < 0 ? v * 32768 : v * 32767;
        if (this.at === this.frame.length) {
          this.port.postMessage(this.frame.buffer, [this.frame.buffer]);
          this.frame = new Int16Array(320);
          this.at = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor('pet-mic', PetMic);
