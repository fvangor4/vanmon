import { describe, expect, it, vi } from 'vitest';
import { createSpeaker, type SpeechSynthLike } from './speech';

class FakeUtterance {
  voice: unknown = null;
  rate = 1;
  pitch = 1;
  lang = '';
  constructor(public text: string) {}
}

function fakeSynth(voices: { name: string; lang: string }[] = []): SpeechSynthLike & { spoken: FakeUtterance[] } {
  const spoken: FakeUtterance[] = [];
  return {
    spoken,
    speak: vi.fn((u: FakeUtterance) => void spoken.push(u)) as any,
    cancel: vi.fn(),
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
    expect(synth.cancel).toHaveBeenCalledTimes(2);
    expect(synth.spoken.map((u) => u.text)).toEqual(['one', 'two']);
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
    createSpeaker({ synth, Utterance: FakeUtterance as any }).say('🔥 Super effective! ⭐');
    expect(synth.spoken[0].text).toBe('Super effective!');
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
