// Read-aloud using the iPad's built-in voice (Web Speech API), so the
// 5-year-old can play without reading. Safari only speaks after a tap, which
// is fine: every read-aloud is started by tapping a speaker button.

export interface SpeechSynthLike {
  speak(u: SpeechSynthesisUtterance): void;
  cancel(): void;
  getVoices(): SpeechSynthesisVoice[];
}

export interface Speaker {
  supported: boolean;
  say(text: string): void;
  stop(): void;
}

/** Friendly-sounding iOS/macOS English voices, best first. */
const PREFERRED_VOICES = ['Samantha', 'Karen', 'Moira', 'Tessa'];

// Emoji and other pictographs (and the joiners/variation selectors between them).
const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu;

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  for (const name of PREFERRED_VOICES) {
    const v = voices.find((v) => v.name === name && v.lang.startsWith('en'));
    if (v) return v;
  }
  return voices.find((v) => v.lang === 'en-US') ?? voices.find((v) => v.lang.startsWith('en')) ?? null;
}

export function createSpeaker(
  env: {
    synth: SpeechSynthLike | undefined;
    Utterance: typeof SpeechSynthesisUtterance | undefined;
  } = {
    synth: typeof speechSynthesis === 'undefined' ? undefined : speechSynthesis,
    Utterance: typeof SpeechSynthesisUtterance === 'undefined' ? undefined : SpeechSynthesisUtterance,
  },
): Speaker {
  const { synth, Utterance } = env;
  if (!synth || !Utterance) return { supported: false, say() {}, stop() {} };

  return {
    supported: true,
    say(text) {
      const clean = text.replace(EMOJI, '').replace(/\s+/g, ' ').trim();
      if (!clean) return;
      synth.cancel();
      const u = new Utterance(clean);
      u.lang = 'en-US';
      u.rate = 0.9;
      u.pitch = 1.1;
      u.voice = pickVoice(synth.getVoices());
      synth.speak(u);
    },
    stop() {
      synth.cancel();
    },
  };
}

/** One shared speaker for the whole game. */
export const speaker = createSpeaker();
