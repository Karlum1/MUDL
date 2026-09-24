let audioCtx: AudioContext | null = null;

export const SFX_KEY = "wm-sfx-v1";

export function isSfxOn() {
  try {
    return localStorage.getItem(SFX_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSfxOn(on: boolean) {
  try {
    localStorage.setItem(SFX_KEY, on ? "on" : "off");
  } catch {
    /* quota */
  }
}

export function unlockSfx() {
  try {
    audioCtx ??= new AudioContext();
    if (audioCtx.state === "suspended") void audioCtx.resume();
  } catch {
    /* ignore */
  }
}

function pluck(ctx: AudioContext, freq: number, start: number, duration = 0.32) {
  const sine = ctx.createOscillator();
  const tri = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  sine.type = "sine";
  tri.type = "triangle";
  sine.frequency.value = freq;
  tri.frequency.value = freq * 2;
  filter.type = "lowpass";
  filter.frequency.value = 2400;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.16, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  sine.connect(filter);
  tri.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  sine.start(start);
  tri.start(start);
  sine.stop(start + duration);
  tri.stop(start + duration);
}

/** Original phone-style chime (not a Samsung ringtone recording). */
export function playFinishRingtone() {
  try {
    if (!isSfxOn()) return;
    unlockSfx();
    if (!audioCtx) return;
    const ctx = audioCtx;
    const now = ctx.currentTime;
    const burst = [0, 0.16, 0.32, 0.48];
    const notes = [784.0, 659.25, 784.0, 523.25];
    for (const offset of [0, 1.05]) {
      burst.forEach((time, index) => {
        pluck(ctx, notes[index], now + offset + time);
      });
    }
  } catch {
    /* ignore */
  }
}
