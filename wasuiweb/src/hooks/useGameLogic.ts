import { useState, useEffect, useMemo, useCallback } from "react";
import { fetchAllTreasures } from "../utils/suiClient";
import { logger, logError } from "../utils/logger";

export type Treasure = {
  id: string;
  creator: string; // New field
  name: string;
  description: string;
  lat: number;
  lng: number;
  isClaimed: boolean;
};

// Initial seeds
// Initial seeds - only used if blockchain fetch fails or as placeholder
const SEED_TREASURES: Treasure[] = [
  {
    id: "0xMock1",
    creator: "0x0",
    name: "Demo Stash (Local)",
    description: "A starter loot for demo purposes.",
    lat: 40.7128,
    lng: -74.0060,
    isClaimed: false
  }
];

export function useGameLogic() {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [treasures, setTreasures] = useState<Treasure[]>([]);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isLoadingTreasures, setIsLoadingTreasures] = useState<boolean>(true);

  // Sync treasures from blockchain
  const syncTreasures = useCallback(async () => {
    try {
      logger.debug("Syncing treasures from blockchain...");
      // Fetch real treasures
      const onChainTreasures = await fetchAllTreasures();

      // Merge logic: For now we'll just use the on-chain ones plus maybe some local temp ones if needed.
      // In a real app we might want to be smarter about merging optimistic updates.
      // For this implementation, we'll effectively replace with on-chain data, 
      // ensuring we don't lose the demo experience if no on-chain data exists yet.

      if (onChainTreasures.length > 0) {
        setTreasures(onChainTreasures);
      } else {
        // Fallback to seed if blockchain empty (for demo)
        // Only if we haven't loaded anything yet
        setTreasures(prev => prev.length === 0 ? SEED_TREASURES : prev);
      }
      setIsLoadingTreasures(false);
    } catch (error) {
      logError("Failed to sync treasures", error);
      // Fallback
      setTreasures(prev => prev.length === 0 ? SEED_TREASURES : prev);
      setIsLoadingTreasures(false);
    }
  }, []);

  // Initial fetch and polling
  useEffect(() => {
    syncTreasures();

    // Poll every 30 seconds
    const intervalId = setInterval(syncTreasures, 30000);
    return () => clearInterval(intervalId);
  }, [syncTreasures]);

  // Helper to add a new treasure locally after transaction success
  const addLocalTreasure = (t: Treasure) => {
    setTreasures((prev) => [...prev, t]);
  };

  // Helper to remove locally
  const removeLocalTreasure = (id: string) => {
    setTreasures((prev) => prev.filter(t => t.id !== id));
  };

  const nearbyTreasure = useMemo(() => {
    if (!userLocation) return null;
    return treasures.find((t) => {
      if (t.isClaimed) return false;
      const dist = getDistanceFromLatLonInM(userLocation.lat, userLocation.lng, t.lat, t.lng);
      return dist < 50;
    });
  }, [userLocation, treasures]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation unsupported");
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsError(null);
      },
      (err) => console.warn(err),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  return {
    userLocation,
    treasures,
    nearbyTreasure,
    gpsError,
    isLoadingTreasures,
    addLocalTreasure,
    removeLocalTreasure,
    refreshTreasures: syncTreasures
  };
}

function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number) { return deg * (Math.PI / 180); }