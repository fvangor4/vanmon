import { describe, expect, it } from 'vitest';
import { createCreature, validateCreatureData, type CreatureData } from './creatures';
import { newGame } from './gameState';
import { GOLD_KID, NPCS, npcCreature, npcGreeting } from './npcs';
import shipped from '../../public/data/creatures.json';

const data: CreatureData = {
  moves: [
    { id: 'bump', name: 'Bump', type: 'normal', power: 35 },
    { id: 'spark', name: 'Spark', type: 'fire', power: 45 },
  ],
  species: [
    { id: 'firey', name: 'Firey', type: 'fire', image: 'f.svg', baseStats: { hp: 50, attack: 50, defense: 50 }, moves: ['bump', 'spark'] },
    { id: 'super-shadehog', name: 'Super Shadehog', type: 'fire', image: 's.svg', baseStats: { hp: 55, attack: 65, defense: 45 }, moves: ['bump', 'spark'], wild: false },
  ],
};
const firey = data.species[0];

describe('NPCS', () => {
  it('has the Gold Kid with Super Shadehog, and every NPC creature exists in the shipped data', () => {
    expect(GOLD_KID).toMatchObject({ id: 'gold-kid', name: 'The Gold Kid', speciesId: 'super-shadehog' });
    expect(NPCS[GOLD_KID.id]).toBe(GOLD_KID);
    const ids = new Set(validateCreatureData(shipped).species.map((s) => s.id));
    for (const npc of Object.values(NPCS)) expect(ids, npc.id).toContain(npc.speciesId);
  });
});

describe('npcCreature', () => {
  it("is the NPC's species at the level of the player's lead creature, fully awake", () => {
    for (const level of [1, 5, 12]) {
      const g = newGame(createCreature(firey, level));
      const g2 = { ...g, party: [...g.party, createCreature(firey, 30)] };
      const foe = npcCreature(GOLD_KID, g2, data);
      expect(foe.speciesId).toBe('super-shadehog');
      expect(foe.level).toBe(level);
      expect(foe.hp).toBe(foe.maxHp);
    }
  });

  it('refuses an NPC whose creature is missing from creatures.json', () => {
    const g = newGame(createCreature(firey, 5));
    expect(() => npcCreature(GOLD_KID, g, { ...data, species: [firey] })).toThrow(/super-shadehog/);
  });
});

describe('npcGreeting', () => {
  it('invites a first math-and-battle, and a rematch once beaten', () => {
    expect(npcGreeting(GOLD_KID, false)).toBe("Hi! I'm the Gold Kid! ✨ Answer my three math questions, then let's battle!");
    expect(npcGreeting(GOLD_KID, true)).toBe("Hi again! ✨ Rematch? Answer three new math questions, then let's battle!");
  });
});
