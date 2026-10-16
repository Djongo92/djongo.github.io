import { useMemo } from 'react';

export interface Badge {
  id: string;
  label: string;
  earned: boolean;
  description: string;
  icon: string; // Feather icon name
}

export function useAchievements(opts: { readCount: number; doneCount: number }) {
  const badges = useMemo<Badge[]>(() => [
    {
      id: 'first-step',
      label: 'First Step',
      earned: opts.readCount >= 1,
      description: 'Read your first chapter',
      icon: 'book-open',
    },
    {
      id: 'explorer',
      label: 'Explorer',
      earned: opts.readCount >= 5,
      description: 'Read 5 chapters',
      icon: 'compass',
    },
    {
      id: 'scholar',
      label: 'Scholar',
      earned: opts.readCount >= 14,
      description: 'Read every chapter',
      icon: 'award',
    },
    {
      id: 'implementer',
      label: 'Implementer',
      earned: opts.doneCount >= 5,
      description: 'Complete 5 action items',
      icon: 'check-circle',
    },
    {
      id: 'closer',
      label: 'Closer',
      earned: opts.doneCount >= 20,
      description: 'Complete 20 action items',
      icon: 'target',
    },
  ], [opts.readCount, opts.doneCount]);

  const earnedCount = badges.filter(b => b.earned).length;

  return { badges, earnedCount };
}
