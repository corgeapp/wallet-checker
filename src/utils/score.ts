// src/utils/score.ts
import type { ScoreCategory } from '../types';

export function classifyScore(score: number): ScoreCategory {
    if (score > 9) return 'diamond';
    if (score > 7) return 'chad';
    if (score > 5) return 'solid';
    if (score > 3) return 'normal';
    if (score > 2.5) return 'flipper';
    if (score > 1) return 'paper';
    return 'jeet';
}

export function classifyLabel(label: string): ScoreCategory | null {
    const normalized = label.trim().toLowerCase();

    if (normalized === 'diamond hands' || normalized === 'diamond') return 'diamond';
    if (normalized === 'chad') return 'chad';
    if (normalized === 'solid') return 'solid';
    if (normalized === 'normal') return 'normal';
    if (normalized === 'flipper') return 'flipper';
    if (normalized === 'paper hands' || normalized === 'paper') return 'paper';
    if (normalized === 'jeet') return 'jeet';

    return null;
}

export interface ScoreCategoryStyle {
    label: string;
    colorClass: string;
    glowClass: string;
    badgeClass: string;
    emoji: string;
}

export const SCORE_CATEGORY_STYLES: Record<ScoreCategory, ScoreCategoryStyle> = {
    diamond: {
        label: 'Diamond Hands',
        colorClass: 'text-[#60a5fa]',
        glowClass: 'glow-diamond',
        badgeClass: 'bg-[rgba(96,165,250,0.15)] text-[#60a5fa] border border-[rgba(96,165,250,0.3)]',
        emoji: '💎',
    },
    chad: {
        label: 'Chad',
        colorClass: 'text-[#22c55e]',
        glowClass: 'glow-chad',
        badgeClass: 'bg-[rgba(34,197,94,0.15)] text-[#22c55e] border border-[rgba(34,197,94,0.3)]',
        emoji: '👑',
    },
    solid: {
        label: 'Solid',
        colorClass: 'text-[#34d399]',
        glowClass: 'glow-solid',
        badgeClass: 'bg-[rgba(52,211,153,0.15)] text-[#34d399] border border-[rgba(52,211,153,0.3)]',
        emoji: '🤝',
    },
    normal: {
        label: 'Normal',
        colorClass: 'text-[#a3a3a3]',
        glowClass: 'glow-normal',
        badgeClass: 'bg-[rgba(163,163,163,0.15)] text-[#a3a3a3] border border-[rgba(163,163,163,0.3)]',
        emoji: '😐',
    },
    flipper: {
        label: 'Flipper',
        colorClass: 'text-[#f59e0b]',
        glowClass: 'glow-flipper',
        badgeClass: 'bg-[rgba(245,158,11,0.15)] text-[#f59e0b] border border-[rgba(245,158,11,0.3)]',
        emoji: '🔄',
    },
    paper: {
        label: 'Paper Hands',
        colorClass: 'text-[#fbbf24]',
        glowClass: 'glow-paper',
        badgeClass: 'bg-[rgba(251,191,36,0.15)] text-[#fbbf24] border border-[rgba(251,191,36,0.3)]',
        emoji: '📉',
    },
    jeet: {
        label: 'Jeet',
        colorClass: 'text-[#f87171]',
        glowClass: 'glow-jeet',
        badgeClass: 'bg-[rgba(248,113,113,0.15)] text-[#f87171] border border-[rgba(248,113,113,0.3)]',
        emoji: '🚨',
    },
};
