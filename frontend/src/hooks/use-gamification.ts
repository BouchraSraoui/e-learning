'use client';

import { useQuery } from '@tanstack/react-query';
import { services } from '@/services';
import type { LeaderboardScope } from '@/types';

export function useBadges() {
  return useQuery({
    queryKey: ['badges'],
    queryFn: () => services.engagement.listBadges(),
  });
}

export function useLeaderboard(scope: LeaderboardScope = 'all') {
  return useQuery({
    queryKey: ['leaderboard', scope],
    queryFn: () => services.engagement.leaderboard(scope),
  });
}
