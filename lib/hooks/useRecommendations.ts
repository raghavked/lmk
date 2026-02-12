'use client';

import { useEffect, useState, useCallback } from 'react';
import { TIMEOUTS, API_LIMITS, STORAGE_KEYS } from '../constants';
export function useRecommendations(category: string, profile: any) {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  // Load seen IDs from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(`${STORAGE_KEYS.SEEN_IDS}_${category}`);
    if (stored) {
      setSeenIds(new Set(JSON.parse(stored)));
    }
  }, [category]);

  // Save seen IDs to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(
      `${STORAGE_KEYS.SEEN_IDS}_${category}`,
      JSON.stringify(Array.from(seenIds))
    );
  }, [seenIds, category]);

  const fetchRecommendations = useCallback(
    async (isLoadMore: boolean = false) => {
      try {
        setLoading(true);
        setError(null);

        const params: any = {
          category,
          limit: API_LIMITS.INITIAL_LOAD,
          offset: isLoadMore ? offset : 0,
          seen_ids: Array.from(seenIds).join(','),
        };

        const queryString = new URLSearchParams(
          Object.entries(params).reduce((acc, [key, value]) => {
            if (value !== undefined && value !== '') {
              acc[key] = String(value);
            }
            return acc;
          }, {} as Record<string, string>)
        ).toString();

        const response = await fetch(`/api/recommend/?${queryString}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch recommendations: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        const newResults = data.results || [];

        if (isLoadMore) {
          setResults((prev) => [...prev, ...newResults]);
          setOffset((prev) => prev + API_LIMITS.INITIAL_LOAD);
        } else {
          setResults(newResults);
          setOffset(API_LIMITS.INITIAL_LOAD);
        }

        // Update seen IDs
        const newSeenIds = new Set(seenIds);
        newResults.forEach((result: any) => {
          newSeenIds.add(result.object.id);
        });
        setSeenIds(newSeenIds);

        setHasMore(newResults.length === API_LIMITS.INITIAL_LOAD);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch recommendations';
        setError(message);
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    },
    [category, seenIds]
  );

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchRecommendations(true);
    }
  }, [loading, hasMore, fetchRecommendations]);

  return {
    results,
    loading,
    error,
    hasMore,
    loadMore,
    refetch: () => fetchRecommendations(false),
  };
}
