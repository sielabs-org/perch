/**
 * Answer-option colours. These four are the first slots of a categorical
 * palette validated all-pairs for colour-vision deficiency on a light
 * surface (worst CVD ΔE 9.2, worst normal-vision ΔE 16.3). Every option also
 * carries a shape + letter badge, so identity is never colour alone.
 */
export const OPTION_COLORS = [
  { key: 'blue',   hex: '#2a78d6', dark: '#1c5cab', soft: '#eaf2fd', letter: 'A', shape: 'triangle' },
  { key: 'orange', hex: '#eb6834', dark: '#c14f23', soft: '#fdefe9', letter: 'B', shape: 'diamond' },
  { key: 'aqua',   hex: '#1baf7a', dark: '#128059', soft: '#e7f7f1', letter: 'C', shape: 'circle' },
  { key: 'violet', hex: '#4a3aa7', dark: '#362a7d', soft: '#eeecf9', letter: 'D', shape: 'square' },
] as const;

export type OptionColor = (typeof OPTION_COLORS)[number];

export const optionColor = (i: number): OptionColor =>
  OPTION_COLORS[i % OPTION_COLORS.length];

export const STATUS = {
  correct: '#1baf7a',
  wrong: '#e34948',
  neutral: '#86857f',
} as const;

export const MEDAL = ['#eda100', '#9a9a94', '#b06a2c'] as const;
