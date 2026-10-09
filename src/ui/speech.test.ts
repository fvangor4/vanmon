import { describe, expect, it, vi } from 'vitest';
import { createSpeaker, type SpeechSynthLike } from './speech';

class FakeUtterance {
  voice: unknown = null;
  rate = 1;
  pitch = 1;
  lang = '';
  constructor(public text: string) {}
}

function fakeSynth(voices: { name: string; lang: string }[] = []): SpeechSynthLike & { spoken: FakeUtterance[]; calls: string[] } {
  const spoken: FakeUtterance[] = [];
  const calls: string[] = [];
  return {
    spoken,
    calls,
    speak: vi.fn((u: FakeUtterance) => {
      calls.push(`speak:${u.text}`);
      spoken.push(u);
    }) as any,
    cancel: vi.fn(() => void calls.push('cancel')),
    getVoices: () => voices as any,
  };
}

describe('createSpeaker', () => {
  it('speaks the given text, a little slower for young listeners', () => {
    const synth = fakeSynth();
    const speaker = createSpeaker({ synth, Utterance: FakeUtterance as any });
    speaker.say('Emberpup appeared!');
    expect(synth.spoken).toHaveLength(1);
    expect(synth.spoken[0].text).toBe('Emberpup appeared!');
    expect(synth.spoken[0].rate).toBeLessThan(1);
    expect(synth.spoken[0].lang).toBe('en-US');
  });

  it('stops anything still talking before saying something new', () => {
    const synth = fakeSynth();
    const speaker = createSpeaker({ synth, Utterance: FakeUtterance as any });
    speaker.say('one');
    speaker.say('two');
    expect(synth.calls).toEqual(['cancel', 'speak:one', 'cancel', 'speak:two']);
  });

  it('prefers a friendly English voice when one is installed', () => {
    const synth = fakeSynth([
      { name: 'Thomas', lang: 'fr-FR' },
      { name: 'Fred', lang: 'en-US' },
      { name: 'Samantha', lang: 'en-US' },
    ]);
    const speaker = createSpeaker({ synth, Utterance: FakeUtterance as any });
    speaker.say('hi');
    expect((synth.spoken[0].voice as any).name).toBe('Samantha');
  });

  it('follows the preference order and ignores non-English voices with a preferred name', () => {
    const synth = fakeSynth([
      { name: 'Samantha', lang: 'es-ES' },
      { name: 'Karen', lang: 'en-AU' },
      { name: 'Moira', lang: 'en-IE' },
    ]);
    createSpeaker({ synth, Utterance: FakeUtterance as any }).say('hi');
    expect((synth.spoken[0].voice as any).name).toBe('Karen');
  });

  it('prefers American English over other English in the fallback', () => {
    const synth = fakeSynth([{ name: 'Daniel', lang: 'en-GB' }, { name: 'Fred', lang: 'en-US' }]);
    createSpeaker({ synth, Utterance: FakeUtterance as any }).say('hi');
    expect((synth.spoken[0].voice as any).name).toBe('Fred');
  });

  it('falls back to any English voice, then to the default', () => {
    const en = fakeSynth([{ name: 'Fr', lang: 'fr-FR' }, { name: 'Daniel', lang: 'en-GB' }]);
    createSpeaker({ synth: en, Utterance: FakeUtterance as any }).say('hi');
    expect((en.spoken[0].voice as any).name).toBe('Daniel');
    const none = fakeSynth([{ name: 'Fr', lang: 'fr-FR' }]);
    createSpeaker({ synth: none, Utterance: FakeUtterance as any }).say('hi');
    expect(none.spoken[0].voice).toBeNull();
  });

  it('strips emoji so the voice does not read their names', () => {
    const synth = fakeSynth();
    const speaker = createSpeaker({ synth, Utterance: FakeUtterance as any });
    speaker.say('🔥 Super effective! ⭐');
    speaker.say('👋🏽 Hi 🇺🇸 friend 1️⃣ 👨‍👩‍👧');
    expect(synth.spoken.map((u) => u.text)).toEqual(['Super effective!', 'Hi friend 1']);
  });

  it('does nothing (and does not throw) where speech is not available', () => {
    const speaker = createSpeaker({ synth: undefined, Utterance: undefined });
    expect(speaker.supported).toBe(false);
    expect(() => speaker.say('hello')).not.toThrow();
    expect(() => speaker.stop()).not.toThrow();
  });

  it('ignores empty text', () => {
    const synth = fakeSynth();
    createSpeaker({ synth, Utterance: FakeUtterance as any }).say('  ');
    expect(synth.spoken).toHaveLength(0);
  });
});
