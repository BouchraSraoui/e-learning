'use client';

import { useQuery } from '@tanstack/react-query';
import { services } from '@/services';

export function useRooms() {
  return useQuery({
    queryKey: ['rooms'],
    queryFn: () => services.community.listRooms(),
    // Chat is live data — always refetch the room list (and its message counts)
    // when the Community page mounts, so counts reflect the database, not a
    // stale snapshot from before messages were sent.
    staleTime: 0,
  });
}

export function useRoomMessages(roomSlug: string) {
  return useQuery({
    queryKey: ['chat', roomSlug],
    queryFn: () => services.community.getMessages(roomSlug),
    enabled: Boolean(roomSlug),
    // Always reload the persisted history from the server when a room opens, so
    // messages sent over the WebSocket (which don't touch this cache) reappear
    // on return instead of showing a stale, empty cached result.
    staleTime: 0,
  });
}
