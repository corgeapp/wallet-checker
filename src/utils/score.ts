// src/utils/score.ts
import type { ScoreCategory } from '../types';

export function classifyScore(score: number): ScoreCategory {
    if (score >= 8) return 'diamond';
    if (score >= 6) return 'holder';
    if (score >= 4) return 'neutral';
    if (score >= 2) return 'weak';
    return 'jeet';
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
    holder: {
        label: 'Solid Holder',
        colorClass: 'text-[#34d399]',
        glowClass: 'glow-holder',
        badgeClass: 'bg-[rgba(52,211,153,0.15)] text-[#34d399] border border-[rgba(52,211,153,0.3)]',
        emoji: '🤝',
    },
    neutral: {
        label: 'Neutral',
        colorClass: 'text-[#a3a3a3]',
        glowClass: 'glow-neutral',
        badgeClass: 'bg-[rgba(163,163,163,0.15)] text-[#a3a3a3] border border-[rgba(163,163,163,0.3)]',
        emoji: '😐',
    },
    weak: {
        label: 'Weak Hands',
        colorClass: 'text-[#fbbf24]',
        glowClass: 'glow-weak',
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
