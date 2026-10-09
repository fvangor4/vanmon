import { describe, expect, it } from 'vitest';
import { battleText, boxText, levelUpText, TYPE_ICON } from './battleText';

const names = { player: (i: number) => ['Emberpup', 'Puddlefin'][i], active: 0, wild: 'Leafbun' };

describe('battleText', () => {
  it('names who used which move', () => {
    expect(battleText({ kind: 'move', side: 'player', moveId: 'spark', moveName: 'Spark' }, names)).toBe('Emberpup used Spark!');
    expect(battleText({ kind: 'move', side: 'wild', moveId: 'bump', moveName: 'Bump' }, names)).toBe('The wild Leafbun used Bump!');
  });

  it('cheers super effective hits, notes weak ones, and stays quiet otherwise', () => {
    const hit = { kind: 'damage', target: 'wild', amount: 5, hpAfter: 3 } as const;
    expect(battleText({ ...hit, effectiveness: 'super' }, names)).toBe('💥 Super effective!');
    expect(battleText({ ...hit, effectiveness: 'weak' }, names)).toBe('Not very effective…');
    expect(battleText({ ...hit, effectiveness: 'normal' }, names)).toBeNull();
  });

  it('says who got sleepy', () => {
    expect(battleText({ kind: 'faint', side: 'wild' }, names)).toBe('The wild Leafbun is sleepy! 💤');
    expect(battleText({ kind: 'faint', side: 'player' }, names)).toBe('Emberpup is sleepy! 💤');
  });

  it('uses the newly sent-out creature after a swap', () => {
    expect(battleText({ kind: 'swap', partyIndex: 1 }, names)).toBe('Go, Puddlefin!');
    expect(battleText({ kind: 'move', side: 'player', moveId: 'x', moveName: 'Splash Shot' }, { ...names, active: 1 })).toBe('Puddlefin used Splash Shot!');
  });

  it('builds suspense for catching', () => {
    expect(battleText({ kind: 'catch', wiggles: 3, caught: true }, names)).toBe('Yay! You caught Leafbun! 🎉');
    expect(battleText({ kind: 'catch', wiggles: 0, caught: false }, names)).toBe('Oh no! It popped right out!');
    expect(battleText({ kind: 'catch', wiggles: 1, caught: false }, names)).toBe('It broke free!');
    expect(battleText({ kind: 'catch', wiggles: 2, caught: false }, names)).toBe('Aww! So close!');
  });

  it('describes how the battle ended, gently', () => {
    expect(battleText({ kind: 'ran' }, names)).toBe('You got away safely! 🏃');
    expect(battleText({ kind: 'won' }, names)).toBe('You won! 🎉');
    expect(battleText({ kind: 'lost' }, names)).toBe("Your creatures got sleepy! 💤 Let's go home and rest.");
  });
});

describe('other battle messages', () => {
  it('celebrates level-ups and says where a caught creature went', () => {
    expect(levelUpText('Emberpup', 6)).toBe('Emberpup grew to level 6! ⭐');
    expect(boxText('Leafbun')).toBe('Your party is full, so Leafbun went to your Box at home. 📦');
  });

  it('has an icon for every move type', () => {
    expect(Object.keys(TYPE_ICON).sort()).toEqual(['fire', 'leaf', 'normal', 'water']);
  });
});
