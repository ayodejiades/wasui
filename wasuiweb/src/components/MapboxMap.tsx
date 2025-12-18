"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { Treasure } from "../hooks/useGameLogic";

const MAP_STYLE = "mapbox://styles/mapbox/standard";

interface MapProps {
    userLocation: { lat: number; lng: number } | null;
    treasures: Treasure[];
    onMapClick?: (lat: number, lng: number) => void;
    onTreasureClick?: (treasure: Treasure) => void;
}

export default function MapboxMap({ userLocation, treasures, onMapClick, onTreasureClick }: MapProps) {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);
    const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
    const userMarkerRef = useRef<mapboxgl.Marker | null>(null);

    useEffect(() => {
        if (map.current || !mapContainer.current) return;

        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        if (!token) {
            console.error("CRITICAL: Mapbox Token is missing in .env.local");
            // Fail gracefully visually
            if (mapContainer.current) {
                mapContainer.current.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #0a0a0f; color: white; padding: 20px; text-align: center;">
              <div>
                <h2 style="color: #ff4d00; margin-bottom: 10px;">⚠️ Configuration Error</h2>
                <p style="color: #ccc; font-size: 14px;">Mapbox token is missing. Please add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local</p>
              </div>
            </div>
          `;
            }
            return;
        }
        mapboxgl.accessToken = token;

        try {
            map.current = new mapboxgl.Map({
                container: mapContainer.current,
                style: MAP_STYLE,
                center: [6.4418, 3.3737],
                zoom: 16,
                pitch: 62,
                bearing: -17.6,
                attributionControl: false,

                config: {
                    basemap: {
                        // THIS IS THE KEY SETTING FOR LIGHTS
                        lightPreset: 'night',
                        showPointOfInterestLabels: false
                    }
                }
            });

            map.current.on('load', () => {
                console.log("✨ Standard Night Mode Loaded");
            });

            map.current.on('error', (e) => {
                console.error("Mapbox Error:", e);
            });
        } catch (error) {
            console.error("Failed to initialize map:", error);
            if (mapContainer.current) {
                mapContainer.current.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #0a0a0f; color: white; padding: 20px; text-align: center;">
            <div>
              <h2 style="color: #ff4d00; margin-bottom: 10px;">⚠️ Map Error</h2>
              <p style="color: #ccc; font-size: 14px;">Failed to load map. Please refresh the page.</p>
            </div>
          </div>
        `;
            }
        }

        return () => {
            map.current?.remove();
            map.current = null;
        };
    }, []);

    // 2. Handle Map Clicks (For Creating Treasures)
    useEffect(() => {
        if (!map.current) return;

        const handleClick = (e: mapboxgl.MapMouseEvent) => {
            if (onMapClick) {
                onMapClick(e.lngLat.lat, e.lngLat.lng);
            }
        };

        map.current.on('click', handleClick);

        return () => {
            map.current?.off('click', handleClick);
        };
    }, [onMapClick]);


    useEffect(() => {
        if (!map.current) return;

        // A. Remove markers for deleted/claimed treasures
        markersRef.current.forEach((marker, id) => {
            const stillExists = treasures.find(t => t.id === id && !t.isClaimed);
            if (!stillExists) {
                marker.remove();
                markersRef.current.delete(id);
            }
        });

        // B. Add new markers
        treasures.forEach((t) => {
            if (t.isClaimed || markersRef.current.has(t.id)) return;

            // Neon Orange Marker
            const el = document.createElement('div');
            el.className = 'treasure-marker';
            el.style.backgroundColor = '#ff4d00';
            el.style.width = '24px';
            el.style.height = '24px';
            el.style.borderRadius = '50%';
            el.style.border = '2px solid white';
            el.style.boxShadow = '0 0 20px #ff4d00'; 
            el.style.cursor = 'pointer';

            el.addEventListener('click', (e) => {
                e.stopPropagation(); 
                if (onTreasureClick) onTreasureClick(t);
            });

            const marker = new mapboxgl.Marker(el)
                .setLngLat([t.lng, t.lat])
                .addTo(map.current!);

            // Only add popup if we don't handle click, or maybe always?
            // If we handle click for selection, popup might be redundant or we can manually show it.
            // Let's keep popup for hovering? Or just remove it to prioritize the click selection UI card.
            // Typically mobile apps use clicking to select bottom sheet info. I'll remove the popup to rely on the clean UI card.

            markersRef.current.set(t.id, marker);
        });
    }, [treasures, onTreasureClick]);

    // 4. Handle User Location (Blue Marker)
    useEffect(() => {
        if (!userLocation || !map.current) return;

        if (!userMarkerRef.current) {
            // Neon Blue User
            const el = document.createElement('div');
            el.className = 'user-marker';
            el.style.backgroundColor = '#00eaff';
            el.style.width = '24px';
            el.style.height = '24px';
            el.style.borderRadius = '50%';
            el.style.border = '2px solid white';
            el.style.boxShadow = '0 0 20px #00eaff'; // Neon Glow

            userMarkerRef.current = new mapboxgl.Marker(el)
                .setLngLat([userLocation.lng, userLocation.lat])
                .addTo(map.current);

            // Initial FlyTo
            map.current.flyTo({
                center: [userLocation.lng, userLocation.lat],
                zoom: 17,
                pitch: 62,
                essential: true
            });
        } else {
            // Smooth update
            userMarkerRef.current.setLngLat([userLocation.lng, userLocation.lat]);
        }
    }, [userLocation]);

    // 5. Handle Snap to Location Event
    useEffect(() => {
        if (!map.current || !userLocation) return;

        const handleSnapToLocation = (e: any) => {
            const { lat, lng } = e.detail || userLocation;
            map.current?.flyTo({
                center: [lng, lat],
                zoom: 17,
                pitch: 62,
                duration: 1500,
                essential: true
            });
        };

        const mapContainer = document.querySelector('[class*="mapboxgl-canvas"]');
        mapContainer?.addEventListener('snapToLocation', handleSnapToLocation);

        return () => {
            mapContainer?.removeEventListener('snapToLocation', handleSnapToLocation);
        };
    }, [userLocation]);

    return <div ref={mapContainer} className="w-full h-full bg-black" />;
}