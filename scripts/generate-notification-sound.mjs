import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

// Original JCuki Chime: a three-note invitation and a soft answering note, synthesized from sine partials.
// No samples, recordings, or third-party audio are used. This generator is deterministic.
const sampleRate = 44100;
const seconds = 1.78;
const frames = Math.round(sampleRate * seconds);
const samples = new Float64Array(frames);
const notes = [
  { start: 0.035, frequency: 523.251, strength: 0.68 },
  { start: 0.185, frequency: 659.255, strength: 0.52 },
  { start: 0.345, frequency: 783.991, strength: 0.48 },
  { start: 0.665, frequency: 1046.502, strength: 0.3 },
];
for (let frame = 0; frame < frames; frame++) {
  const t = frame / sampleRate;
  let value = 0;
  for (const note of notes) {
    const age = t - note.start;
    if (age <= 0) continue;
    const attack = 1 - Math.exp(-age * 140);
    const body =
      Math.exp(-age * 5.9) * Math.sin(2 * Math.PI * note.frequency * age);
    const shimmer =
      0.15 *
      Math.exp(-age * 10.5) *
      Math.sin(2 * Math.PI * note.frequency * 2.005 * age);
    const softPartial =
      0.045 *
      Math.exp(-age * 14) *
      Math.sin(2 * Math.PI * note.frequency * 3.99 * age);
    value += note.strength * attack * (body + shimmer + softPartial);
  }
  // Remove clicks at the start and end; leave a short tail for a natural decay.
  const fadeOut = Math.min(1, Math.max(0, (seconds - t) / 0.11));
  samples[frame] = value * fadeOut;
}
const peak = Math.max(...samples);
const negativePeak = Math.abs(Math.min(...samples));
const normalization = 0.55 / Math.max(peak, negativePeak);
const wav = Buffer.alloc(44 + frames * 2);
wav.write("RIFF", 0);
wav.writeUInt32LE(wav.length - 8, 4);
wav.write("WAVE", 8);
wav.write("fmt ", 12);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20); // Linear PCM
wav.writeUInt16LE(1, 22); // Mono
wav.writeUInt32LE(sampleRate, 24);
wav.writeUInt32LE(sampleRate * 2, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write("data", 36);
wav.writeUInt32LE(frames * 2, 40);
for (let frame = 0; frame < frames; frame++)
  wav.writeInt16LE(
    Math.round(samples[frame] * normalization * 32767),
    44 + frame * 2,
  );
const target = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../assets/sounds/jcuki_chime.wav",
);
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, wav);
console.log(
  JSON.stringify({
    file: "assets/sounds/jcuki_chime.wav",
    duration: seconds,
    sampleRate,
    channels: 1,
    bitsPerSample: 16,
    bytes: wav.length,
    peak: 0.55,
    sha256: createHash("sha256").update(wav).digest("hex"),
  }),
);
