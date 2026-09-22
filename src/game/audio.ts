let ctx: AudioContext | null = null;
let muted = false;

function ac() {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export const audio = {
  init: () => ac(),
  toggleMute() {
    muted = !muted;
    return muted;
  },
  get muted() {
    return muted;
  },
  tone(freq: number, dur: number, type: OscillatorType = "square", gain = 0.08) {
    const c = ac();
    if (!c || muted) return;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.4), c.currentTime + dur);
    g.gain.setValueAtTime(gain, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    osc.connect(g).connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + dur);
  },
  noise(dur: number, gain = 0.15, filterHz = 1200) {
    const c = ac();
    if (!c || muted) return;
    const frames = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, frames, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = filterHz;
    const g = c.createGain();
    g.gain.value = gain;
    src.connect(f).connect(g).connect(c.destination);
    src.start();
  },
  shot() {
    this.noise(0.18, 0.22, 2600);
    this.tone(180, 0.12, "sawtooth", 0.09);
  },
  empty() {
    this.tone(900, 0.05, "square", 0.04);
  },
  reload() {
    this.tone(300, 0.08, "square", 0.05);
    setTimeout(() => this.tone(220, 0.1, "square", 0.05), 260);
  },
  hit() {
    this.noise(0.12, 0.12, 700);
  },
  kill() {
    this.tone(120, 0.35, "sawtooth", 0.08);
  },
  hurt() {
    this.tone(90, 0.3, "triangle", 0.14);
  },
  wave() {
    this.tone(320, 0.5, "sine", 0.1);
    setTimeout(() => this.tone(240, 0.7, "sine", 0.1), 220);
  },
  groan() {
    this.tone(70 + Math.random() * 40, 0.7, "sawtooth", 0.035);
  },
};
