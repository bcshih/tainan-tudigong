import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { DayItinerary } from "../../types";

mapboxgl.accessToken = (import.meta.env.VITE_MAPBOX_TOKEN || "pk.eyJ1IjoiZHVtbXkiLCJhIjoiY2x4eHh4eHh4eHh4eHh4eHh4eHh4eHh4In0.dummy") as string;

interface Props {
  itinerary: DayItinerary | undefined;
  activeItemId?: string;
}

// Tainan center
const TAINAN_CENTER: [number, number] = [120.2012, 22.9998];

export function MapView({ itinerary, activeItemId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const popupsRef = useRef<mapboxgl.Popup[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      // Soft pinkish-white style
      style: "mapbox://styles/mapbox/dark-v11",
      center: TAINAN_CENTER,
      zoom: 13,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-left");

    map.on("load", () => {
      setMapLoaded(true);
      map.flyTo({ center: TAINAN_CENTER, zoom: 13, duration: 1200, essential: true });
    });

    // Release spinner even on token/network error so UI isn't stuck
    map.on("error", (e) => {
      console.error("[MapView] Mapbox error:", e.error);
      setMapLoaded(true);
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Update markers when itinerary changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    // Clear old markers & popups
    markersRef.current.forEach(m => m.remove());
    popupsRef.current.forEach(p => p.remove());
    markersRef.current = [];
    popupsRef.current = [];
    // Clear old route layers
    if (map.getLayer("route-arrows")) map.removeLayer("route-arrows");
    if (map.getLayer("route")) map.removeLayer("route");
    if (map.getSource("route")) map.removeSource("route");

    const items = itinerary?.items.filter(i => i.spot.lat && i.spot.lng) ?? [];
    if (items.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();
    const lastIdx = items.length - 1;

    items.forEach((item, idx) => {
      const { lat, lng, name, openHours, tags } = item.spot;
      const isActive = item.id === activeItemId;
      const isFirst = idx === 0;
      const isLast = idx === lastIdx && lastIdx > 0;

      // Custom marker element
      const el = document.createElement("div");
      el.className = "map-marker";
      el.innerHTML = `
        <div class="map-marker-pulse ${isActive ? "map-marker-pulse--active" : ""}"></div>
        <div class="map-marker-dot ${isActive ? "map-marker-dot--active" : ""} ${isFirst ? "map-marker-dot--start" : ""} ${isLast ? "map-marker-dot--end" : ""}">${item.order}</div>
        ${isFirst ? '<div class="map-marker-label map-marker-label--start">起</div>' : ""}
        ${isLast ? '<div class="map-marker-label map-marker-label--end">終</div>' : ""}
      `;

      // Popup
      const popup = new mapboxgl.Popup({
        offset: 32,
        closeButton: false,
        className: "map-popup",
      }).setHTML(`
        <div class="popup-inner">
          <div class="popup-order">${item.order}</div>
          <div class="popup-content">
            <p class="popup-name">${name}</p>
            ${openHours ? `<p class="popup-hours">⏰ ${openHours}</p>` : ""}
            ${tags?.length ? `<div class="popup-tags">${tags.map(t => `<span class="popup-tag">${t}</span>`).join("")}</div>` : ""}
          </div>
        </div>
      `);

      const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([lng!, lat!])
        .setPopup(popup)
        .addTo(map);

      el.addEventListener("mouseenter", () => popup.addTo(map));
      el.addEventListener("mouseleave", () => popup.remove());

      markersRef.current.push(marker);
      popupsRef.current.push(popup);
      bounds.extend([lng!, lat!]);
    });

    // Draw route line between spots (real walking path via Mapbox Directions)
    if (items.length > 1) {
      const coords = items.map(i => [i.spot.lng!, i.spot.lat!] as [number, number]);

      const drawRoute = (geometry: GeoJSON.LineString | GeoJSON.MultiLineString) => {
        const data: GeoJSON.Feature = { type: "Feature", properties: {}, geometry };
        map.addSource("route", { type: "geojson", data });
        map.addLayer({
          id: "route",
          type: "line",
          source: "route",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#cf447a",
            "line-width": 3,
            "line-dasharray": [1, 2.5],
            "line-opacity": 0.85,
          },
        });

        // Arrow direction indicators
        if (!map.hasImage("route-arrow")) {
          const size = 24;
          const canvas = document.createElement("canvas");
          canvas.width = size; canvas.height = size;
          const ctx = canvas.getContext("2d")!;
          ctx.fillStyle = "#cf447a";
          ctx.beginPath();
          ctx.moveTo(4, 5); ctx.lineTo(20, 12); ctx.lineTo(4, 19);
          ctx.closePath(); ctx.fill();
          map.addImage("route-arrow", canvas);
        }
        map.addLayer({
          id: "route-arrows",
          type: "symbol",
          source: "route",
          layout: {
            "symbol-placement": "line",
            "symbol-spacing": 70,
            "icon-image": "route-arrow",
            "icon-size": 0.65,
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          },
        });
      };

      // Fetch real walking route from Mapbox Directions API
      const token = mapboxgl.accessToken;
      const coordStr = coords.map(c => c.join(",")).join(";");
      fetch(
        `https://api.mapbox.com/directions/v5/mapbox/walking/${coordStr}` +
        `?geometries=geojson&overview=full&access_token=${token}`
      )
        .then(r => r.json())
        .then(data => {
          if (data.routes?.[0]?.geometry) {
            drawRoute(data.routes[0].geometry);
          } else {
            // Fallback to straight lines if directions unavailable
            drawRoute({ type: "LineString", coordinates: coords });
          }
        })
        .catch(() => drawRoute({ type: "LineString", coordinates: coords }));
    }

    // Fit map to markers with animation
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, {
        padding: { top: 80, bottom: 80, left: 80, right: 80 },
        duration: 900,
        essential: true,
      });
    }
  }, [itinerary, mapLoaded, activeItemId]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      {!mapLoaded && (
        <div className="map-loading">
          <div className="map-loading-spinner"/>
          <p>地圖載入中…</p>
        </div>
      )}
    </div>
  );
}
