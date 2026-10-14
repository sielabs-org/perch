export const PLAYER_EMOJIS = [
  '🦊', '🐼', '🦁', '🐯', '🐨', '🦄', '🚀', '🥑', '⚡', '🍕',
  '🐙', '🐸', '🐶', '🐱', '🐵', '🐧', '🦉', '🦋', '🦖', '🐝',
  '🧁', '🍩', '🎯', '🎸', '👾', '🔥', '🌈', '💎', '🎉', '🌟',
  '🍀', '🏄', '🌮', '🎈', '🎨', '🧩', '🐳', '🍓', '🏀', '🏖️',
];

/**
 * Deterministically picks a fun emoji for any player ID/name
 * so it stays consistent throughout the game.
 */
export function getPlayerEmoji(id: string, name = ''): string {
  const seed = `${id || ''}:${name || ''}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return PLAYER_EMOJIS[hash % PLAYER_EMOJIS.length];
}
