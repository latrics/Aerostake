'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import L from 'leaflet';
import {
  Compass,
  Maximize2,
  Minimize2,
  UploadCloud,
  Crosshair,
  MapPin,
  Eye,
  Menu,
  X,
  ZoomIn,
  ZoomOut,
  Info,
} from 'lucide-react';
import { Sector } from '../types';
import { getSectorVisualState, getSectorPolygonStyle, SECTOR_STYLES } from '../sectorStyles';

interface RealWorldProjectMapProps {
  projectId?: string;
  project?: any;
  sectors: Sector[];
  selectedSectorCode: string;
  onSelectSector: (sectorCode: string) => void;
  mapMode: 'satellite' | 'map';
  setMapMode: (mode: 'satellite' | 'map') => void;
  isOpsOrAdmin: boolean;
  isClient?: boolean;
  onOpenUploadKml?: () => void;
  height?: string;
  borderRadius?: string;
}

/**
 * Universal extractor for sector geometry coordinates.
 * Handles GeoJSON Polygon, MultiPolygon, simple coordinate arrays,
 * stringified JSON, bbox, and centroid fallbacks.
 */
function extractSectorCoordinates(sec: Sector): [number, number][] {
  if (!sec) return [];
  const raw = sec.polygon_coordinates;
  if (!raw) return [];

  let parsed: any = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }

  // 1. coords.geojson.coordinates[0]
  const geojsonRing = parsed.geojson?.coordinates?.[0];
  if (geojsonRing && Array.isArray(geojsonRing) && geojsonRing.length >= 3) {
    return geojsonRing
      .filter((pt: any) => Array.isArray(pt) && pt.length >= 2 && !isNaN(Number(pt[0])) && !isNaN(Number(pt[1])))
      .map(([lng, lat]: [number, number]) => [Number(lat), Number(lng)]);
  }

  // 2. coords.geometry.coordinates[0]
  const geomRing = parsed.geometry?.coordinates?.[0];
  if (geomRing && Array.isArray(geomRing) && geomRing.length >= 3) {
    return geomRing
      .filter((pt: any) => Array.isArray(pt) && pt.length >= 2 && !isNaN(Number(pt[0])) && !isNaN(Number(pt[1])))
      .map(([lng, lat]: [number, number]) => [Number(lat), Number(lng)]);
  }

  // 3. coords.coordinates[0] (Standard GeoJSON Polygon)
  const coordsRing = parsed.coordinates?.[0];
  if (coordsRing && Array.isArray(coordsRing) && coordsRing.length >= 3) {
    return coordsRing
      .filter((pt: any) => Array.isArray(pt) && pt.length >= 2 && !isNaN(Number(pt[0])) && !isNaN(Number(pt[1])))
      .map(([lng, lat]: [number, number]) => [Number(lat), Number(lng)]);
  }

  // 4. Raw array of [lng, lat] tuples
  if (Array.isArray(parsed) && parsed.length >= 3 && Array.isArray(parsed[0])) {
    return parsed
      .filter((pt: any) => Array.isArray(pt) && pt.length >= 2 && !isNaN(Number(pt[0])) && !isNaN(Number(pt[1])))
      .map(([lng, lat]: [number, number]) => [Number(lat), Number(lng)]);
  }

  // 5. bbox: [minLng, minLat, maxLng, maxLat]
  if (parsed.bbox && Array.isArray(parsed.bbox) && parsed.bbox.length === 4) {
    const [minLng, minLat, maxLng, maxLat] = parsed.bbox.map(Number);
    if (!isNaN(minLng) && !isNaN(minLat) && !isNaN(maxLng) && !isNaN(maxLat)) {
      return [
        [minLat, minLng],
        [minLat, maxLng],
        [maxLat, maxLng],
        [maxLat, minLng],
      ];
    }
  }

  // 6. centroid fallback
  if (parsed.centroid && typeof parsed.centroid.lat === 'number' && typeof parsed.centroid.lng === 'number') {
    const { lat, lng } = parsed.centroid;
    const d = 0.002;
    return [
      [lat - d, lng - d],
      [lat - d, lng + d],
      [lat + d, lng + d],
      [lat + d, lng - d],
    ];
  }

  return [];
}

/**
 * Universal extractor for sector label centroid.
 */
function extractSectorCentroid(sec: Sector, latLngs: [number, number][]): [number, number] | null {
  const raw = sec.polygon_coordinates;
  if (raw) {
    let parsed: any = raw;
    if (typeof raw === 'string') {
      try {
        parsed = JSON.parse(raw);
      } catch {
        // ignore
      }
    }
    if (
      parsed?.centroid &&
      typeof parsed.centroid.lat === 'number' &&
      typeof parsed.centroid.lng === 'number' &&
      !isNaN(parsed.centroid.lat) &&
      !isNaN(parsed.centroid.lng)
    ) {
      return [parsed.centroid.lat, parsed.centroid.lng];
    }
  }

  if (latLngs.length > 0) {
    const sum = latLngs.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0]);
    return [sum[0] / latLngs.length, sum[1] / latLngs.length];
  }

  return null;
}

export const RealWorldProjectMap: React.FC<RealWorldProjectMapProps> = ({
  projectId,
  project,
  sectors = [],
  selectedSectorCode,
  onSelectSector,
  mapMode,
  setMapMode,
  isOpsOrAdmin,
  isClient = false,
  onOpenUploadKml,
  height,
  borderRadius,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const polygonLayersRef = useRef<Record<string, L.Polygon>>({});
  const labelMarkersRef = useRef<L.LayerGroup | null>(null);
  const aoiBoundsRef = useRef<L.LatLngBounds | null>(null);

  // Tracks the fingerprint of the dataset that has been fitted to prevent unwanted snapbacks
  const fittedFingerprintRef = useRef<string>('');

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(13);
  const [showAllLabels, setShowAllLabels] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close hamburger menu on click outside
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const handleZoomIn = () => {
    mapRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapRef.current?.zoomOut();
  };

  // Compute parsed geometries for all sectors
  const sectorGeometries = useMemo(() => {
    return sectors.map((sec) => {
      const latLngs = extractSectorCoordinates(sec);
      const centroid = extractSectorCentroid(sec, latLngs);
      return {
        sector: sec,
        latLngs,
        centroid,
      };
    });
  }, [sectors]);

  // Aggregate all LatLng points across all sectors
  const allLatLngs = useMemo(() => {
    const pts: [number, number][] = [];
    sectorGeometries.forEach((g) => {
      pts.push(...g.latLngs);
    });
    return pts;
  }, [sectorGeometries]);

  // Calculate dynamic default center (computed from actual sectors, or project location, NOT Delhi)
  const defaultCenter = useMemo<[number, number]>(() => {
    if (allLatLngs.length > 0) {
      const sum = allLatLngs.reduce((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0]);
      return [sum[0] / allLatLngs.length, sum[1] / allLatLngs.length];
    }
    // Check if project has geographic metadata
    if (project?.latitude && project?.longitude) {
      const pLat = Number(project.latitude);
      const pLng = Number(project.longitude);
      if (!isNaN(pLat) && !isNaN(pLng)) {
        return [pLat, pLng];
      }
    }
    // Default to geometric center of India
    return [20.5937, 78.9629];
  }, [allLatLngs, project]);

  // Fingerprint of the dataset (changes when project changes or when sectors coordinates change)
  const datasetFingerprint = useMemo(() => {
    const projKey = projectId || project?.id || 'default';
    if (sectors.length === 0) return `${projKey}-empty`;

    const first = sectors[0];
    const last = sectors[sectors.length - 1];
    const firstCoordStr = JSON.stringify(first.polygon_coordinates || '').slice(0, 60);
    const lastCoordStr = JSON.stringify(last.polygon_coordinates || '').slice(0, 60);

    return `${projKey}-${sectors.length}-${first.sector_code}-${last.sector_code}-${firstCoordStr}-${lastCoordStr}`;
  }, [projectId, project?.id, sectors]);

  // Helper to reliably fit bounds even if map container is still laying out
  const fitBoundsSafely = useCallback((bounds: L.LatLngBounds, immediate = false) => {
    const map = mapRef.current;
    if (!map || !bounds || !bounds.isValid()) return;

    const attempt = () => {
      const size = map.getSize();
      if (size.x > 0 && size.y > 0) {
        map.fitBounds(bounds, { padding: [35, 35], maxZoom: 16, animate: !immediate });
        return true;
      }
      return false;
    };

    if (!attempt()) {
      // Container layout not ready yet: invalidate size and retry in 100ms and 250ms
      setTimeout(() => {
        if (!mapRef.current) return;
        mapRef.current.invalidateSize({ animate: false });
        if (!attempt()) {
          setTimeout(() => {
            if (!mapRef.current) return;
            mapRef.current.invalidateSize({ animate: false });
            attempt();
          }, 250);
        }
      }, 100);
    }
  }, []);

  // 1. Initialize Map ONCE
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true,
    });


    // Attribution
    L.control
      .attribution({ position: 'bottomleft', prefix: false })
      .addAttribution('&copy; Esri World Imagery &bull; LATRICS Aerial GIS')
      .addTo(map);

    // Label markers layer group
    const labelGroup = L.layerGroup().addTo(map);
    labelMarkersRef.current = labelGroup;
    mapRef.current = map;

    // Track user zooming without resetting bounds
    map.on('zoomend', () => {
      setZoomLevel(map.getZoom());
    });

    // Ensure map layout is properly computed once rendered in DOM
    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 2. Tile Layer Switcher
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    let maxZoom = 19;

    if (mapMode === 'map') {
      url = 'https://{s}.tile.openstreetmap.org/{z}/{x}.png';
      maxZoom = 19;
    }

    const tileLayer = L.tileLayer(url, {
      maxZoom,
      subdomains: ['a', 'b', 'c'],
    }).addTo(map);

    tileLayerRef.current = tileLayer;
  }, [mapMode]);

  // 3. Render Polygon Geometries & Auto-Center on initial load or dataset change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous polygons
    Object.values(polygonLayersRef.current).forEach((poly) => {
      map.removeLayer(poly);
    });
    polygonLayersRef.current = {};

    if (sectors.length === 0 || allLatLngs.length === 0) {
      aoiBoundsRef.current = null;
      return;
    }

    // Render polygons with real-world state lifecycle styling
    sectorGeometries.forEach(({ sector: sec, latLngs }) => {
      if (latLngs.length < 3) return;

      const isSelected = sec.sector_code === selectedSectorCode;
      const style = getSectorPolygonStyle(sec, project, isSelected, isClient);

      const polygon = L.polygon(latLngs, {
        color: style.color,
        fillColor: style.fillColor,
        fillOpacity: style.fillOpacity,
        weight: style.weight,
        dashArray: style.dashArray,
      }).addTo(map);

      // Interactive hover
      polygon.on('mouseover', () => {
        polygon.setStyle({
          color: '#ffffff',
          weight: 3,
          fillOpacity: Math.min(style.fillOpacity + 0.25, 0.95),
        });
      });

      polygon.on('mouseout', () => {
        const isCurrentSelected = sec.sector_code === selectedSectorCode;
        const currentStyle = getSectorPolygonStyle(sec, project, isCurrentSelected, isClient);
        polygon.setStyle({
          color: currentStyle.color,
          weight: currentStyle.weight,
          fillColor: currentStyle.fillColor,
          fillOpacity: currentStyle.fillOpacity,
          dashArray: currentStyle.dashArray,
        });
      });

      polygon.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectSector(sec.sector_code);
      });

      // Tooltip with detailed visual status
      const isClientCompleted = style.state === 'completed';
      const isInProgress =
        sec.status === 'in_progress' ||
        (sec.progress_percent !== undefined && sec.progress_percent > 0 && sec.progress_percent < 100) ||
        (sec.flight_logs && (sec.flight_logs as any[]).length > 0);
      const tooltipLabel = isClient
        ? (isClientCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Pending')
        : style.cfg.label;

      polygon.bindTooltip(
        `<div style="font-family: inherit; font-size: 11px; font-weight: 700; color: #fff; line-height: 1.35; padding: 2px;">
          <div style="font-size: 12px; font-weight: 800; letter-spacing: 0.5px; color: ${style.cfg.strokeColor};">SECTOR ${sec.sector_code}</div>
          <div style="color: #cbd5e1; font-size: 10px; margin-top: 1px;">Area: <strong style="color: #fff;">${sec.target_area_sqkm || 0} km²</strong></div>
          <div style="margin-top: 4px; display: inline-flex; align-items: center; gap: 5px; padding: 2px 7px; border-radius: 4px; background: ${style.cfg.badgeBg}; border: 1px solid ${style.cfg.badgeBorder}; color: ${style.cfg.badgeColor}; font-size: 9.5px; font-weight: 800;">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${style.cfg.dotColor};"></span>
            ${tooltipLabel}
          </div>
        </div>`,
        {
          direction: 'top',
          sticky: true,
          className: 'aerostake-map-tooltip',
        }
      );

      polygonLayersRef.current[sec.sector_code] = polygon;
    });

    // Compute bounding box
    const bounds = L.latLngBounds(allLatLngs);
    if (bounds.isValid()) {
      aoiBoundsRef.current = bounds;

      // Auto-fit ONLY when this specific dataset has not been fitted yet
      if (fittedFingerprintRef.current !== datasetFingerprint) {
        fitBoundsSafely(bounds, true);
        fittedFingerprintRef.current = datasetFingerprint;
      }
    }
  }, [datasetFingerprint, sectorGeometries, allLatLngs, fitBoundsSafely, selectedSectorCode, onSelectSector, sectors.length, project, isClient]);

  // 4. Update Polygon Selection Highlight without snapping map camera
  useEffect(() => {
    sectors.forEach((sec) => {
      const polygon = polygonLayersRef.current[sec.sector_code];
      if (!polygon) return;

      const isSelected = selectedSectorCode === sec.sector_code;
      const currentStyle = getSectorPolygonStyle(sec, project, isSelected, isClient);

      polygon.setStyle({
        color: currentStyle.color,
        fillColor: currentStyle.fillColor,
        fillOpacity: currentStyle.fillOpacity,
        weight: currentStyle.weight,
        dashArray: currentStyle.dashArray,
      });

      if (isSelected) {
        polygon.bringToFront();
      }
    });
  }, [selectedSectorCode, sectors, project, isClient]);

  // 5. Update Labels dynamically based on zoom & user preference
  useEffect(() => {
    const map = mapRef.current;
    const labelGroup = labelMarkersRef.current;
    if (!map || !labelGroup) return;

    labelGroup.clearLayers();
    if (sectors.length === 0) return;

    sectorGeometries.forEach(({ sector: sec, centroid }, idx) => {
      if (!centroid) return;

      const isSelected = selectedSectorCode === sec.sector_code;
      const state = getSectorVisualState(sec, project, isClient);
      const cfg = SECTOR_STYLES[state];

      // Smart density rules matching user request:
      // - Deep zoom (>= 15): show all sectors
      // - Zoom 14: show every 2nd or 3rd
      // - Overview (< 14): show spaced out representative markers or selected sector
      // - "Labels" toggle active: show all
      const shouldDisplay =
        isSelected ||
        showAllLabels ||
        zoomLevel >= 15 ||
        (zoomLevel === 14 && idx % 3 === 0) ||
        (zoomLevel < 14 && idx % 10 === 0);

      if (!shouldDisplay) return;

      const customIcon = L.divIcon({
        className: 'aerostake-sector-label',
        html: `<div style="
          background: ${isSelected ? '#09090b' : 'rgba(9, 9, 11, 0.88)'};
          backdrop-filter: blur(6px);
          border: 1.5px solid ${isSelected ? '#ffffff' : cfg.strokeColor};
          border-radius: 4px;
          padding: ${zoomLevel >= 15 ? '3px 6px' : '2px 5px'};
          color: #ffffff;
          font-size: ${zoomLevel >= 15 ? '10px' : '9px'};
          font-weight: 800;
          white-space: nowrap;
          text-align: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.6);
          transform: translate(-50%, -50%);
          pointer-events: auto;
          cursor: pointer;
          transition: transform 0.15s ease;
        ">
          <div style="display: flex; align-items: center; justify-content: center; gap: 3px; line-height: 1.1; letter-spacing: 0.3px;">
            <span style="display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: ${cfg.dotColor};"></span>
            <span style="color: ${isSelected ? '#ffffff' : cfg.strokeColor};">${sec.sector_code}</span>
          </div>
          <div style="font-size: 8px; color: #cbd5e1; line-height: 1; margin-top: 1px;">${sec.target_area_sqkm || 0} km²</div>
        </div>`,
        iconSize: [0, 0],
      });

      const marker = L.marker(centroid, { icon: customIcon });
      marker.on('click', () => {
        onSelectSector(sec.sector_code);
      });
      marker.addTo(labelGroup);
    });
  }, [zoomLevel, sectorGeometries, selectedSectorCode, showAllLabels, sectors.length, onSelectSector, project, isClient]);

  // 6. Recenter / Fit AOI helper (user-triggered button)
  const handleRecenterAoi = useCallback(() => {
    const map = mapRef.current;
    if (!map || !aoiBoundsRef.current) return;
    map.fitBounds(aoiBoundsRef.current, { padding: [35, 35], maxZoom: 16, animate: true });
  }, []);

  // 7. Fullscreen Toggle & Invalidate Size
  const handleToggleFullscreen = () => {
    setIsFullscreen((prev) => {
      const next = !prev;
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 150);
      return next;
    });
  };

  // Keyboard shortcut: Esc to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
        setTimeout(() => {
          mapRef.current?.invalidateSize();
        }, 150);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // ResizeObserver to handle container layout changes cleanly
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize({ animate: false });
      }
    });

    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  const selectedSector = sectors.find((s) => s.sector_code === selectedSectorCode);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: isFullscreen ? '100vh' : (height || '380px'),
        backgroundColor: '#09090b',
        borderRadius: isFullscreen ? '0px' : (borderRadius || '0px'),
        overflow: 'hidden',
        zIndex: isFullscreen ? 99999 : 1,
        ...(isFullscreen && {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }),
      }}
    >
      {/* ── Single Floating Hamburger Map Controller ── */}
      <div
        ref={menuRef}
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 1000,
          pointerEvents: 'auto',
        }}
      >
        <button
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            backgroundColor: 'rgba(9, 9, 11, 0.90)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.22)',
            borderRadius: '8px',
            color: '#ffffff',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5)',
            transition: 'all 0.15s ease',
          }}
          title="Map Controls & Legend"
        >
          {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        {/* Dropdown Menu */}
        {isMenuOpen && (
          <div
            style={{
              position: 'absolute',
              top: '44px',
              right: 0,
              width: '270px',
              backgroundColor: 'rgba(9, 9, 11, 0.95)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.20)',
              borderRadius: '8px',
              padding: '0.85rem',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.7)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
              color: '#ffffff',
              fontSize: '0.75rem',
              zIndex: 1001,
            }}
          >
            {/* 1. Fit AOI & Labels Toggle */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => {
                  handleRecenterAoi();
                  setIsMenuOpen(false);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '6px',
                  color: '#ffffff',
                  padding: '7px 8px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Crosshair size={14} color="#38bdf8" />
                <span>Fit AOI</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAllLabels(!showAllLabels)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  backgroundColor: showAllLabels ? '#38bdf8' : 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '6px',
                  color: showAllLabels ? '#09090b' : '#ffffff',
                  padding: '7px 8px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Eye size={14} />
                <span>{showAllLabels ? 'Hide Labels' : 'All Labels'}</span>
              </button>
            </div>

            {/* 2. Tile Layer (Satellite vs Street) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.25rem',
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                padding: '3px',
                borderRadius: '6px',
              }}
            >
              <button
                type="button"
                onClick={() => setMapMode('satellite')}
                style={{
                  border: 'none',
                  backgroundColor: mapMode === 'satellite' ? '#ffffff' : 'transparent',
                  color: mapMode === 'satellite' ? '#09090b' : '#a1a1aa',
                  padding: '5px',
                  borderRadius: '4px',
                  fontSize: '0.725rem',
                  fontWeight: mapMode === 'satellite' ? 800 : 600,
                  cursor: 'pointer',
                }}
              >
                Satellite View
              </button>
              <button
                type="button"
                onClick={() => setMapMode('map')}
                style={{
                  border: 'none',
                  backgroundColor: mapMode === 'map' ? '#ffffff' : 'transparent',
                  color: mapMode === 'map' ? '#09090b' : '#a1a1aa',
                  padding: '5px',
                  borderRadius: '4px',
                  fontSize: '0.725rem',
                  fontWeight: mapMode === 'map' ? 800 : 600,
                  cursor: 'pointer',
                }}
              >
                Street Map
              </button>
            </div>

            {/* 3. Zoom Controls & Maximise View */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr', gap: '0.45rem' }}>
              <button
                type="button"
                onClick={handleZoomIn}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.3rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '6px',
                  color: '#ffffff',
                  padding: '6px 4px',
                  fontSize: '0.725rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                title="Zoom in"
              >
                <ZoomIn size={13} />
                <span>Zoom In</span>
              </button>

              <button
                type="button"
                onClick={handleZoomOut}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.3rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '6px',
                  color: '#ffffff',
                  padding: '6px 4px',
                  fontSize: '0.725rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                title="Zoom out"
              >
                <ZoomOut size={13} />
                <span>Zoom Out</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleToggleFullscreen();
                  setIsMenuOpen(false);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '6px',
                  color: '#ffffff',
                  padding: '6px 4px',
                  fontSize: '0.725rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                title={isFullscreen ? 'Exit fullscreen' : 'Maximise view'}
              >
                {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                <span>{isFullscreen ? 'Exit' : 'Maximise'}</span>
              </button>
            </div>

            {/* 4. Grid Status Explanation (Non-clickable, informative only) */}
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.14)', paddingTop: '0.65rem', marginTop: '0.2rem' }}>
              <div
                style={{
                  fontSize: '0.675rem',
                  fontWeight: 800,
                  color: '#94a3b8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <Info size={12} color="#38bdf8" />
                <span>Grid Status Explanation</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.725rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#64748b', border: isClient ? '1px solid #94a3b8' : '1px dashed #94a3b8', flexShrink: 0 }} />
                  <span style={{ color: '#cbd5e1' }}><strong style={{ color: '#ffffff' }}>Grey</strong> — {isClient ? 'In Progress / Pending' : 'Pending / Scheduled'}</span>
                </div>
                {!isClient && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#eab308', flexShrink: 0 }} />
                    <span style={{ color: '#cbd5e1' }}><strong style={{ color: '#ffffff' }}>Yellow</strong> — Scanning / In Progress</span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#16a34a', flexShrink: 0 }} />
                  <span style={{ color: '#cbd5e1' }}><strong style={{ color: '#ffffff' }}>Green</strong> — {isClient ? 'Completed' : 'Completed on Schedule'}</span>
                </div>
                {!isClient && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#dc2626', flexShrink: 0 }} />
                      <span style={{ color: '#cbd5e1' }}><strong style={{ color: '#ffffff' }}>Red</strong> — Overdue / Not Completed</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: '#ea580c', flexShrink: 0 }} />
                      <span style={{ color: '#cbd5e1' }}><strong style={{ color: '#ffffff' }}>Orange</strong> — Completed with Delay</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Empty State when no sectors exist */}
      {sectors.length === 0 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.65rem',
            backgroundColor: 'rgba(9, 9, 11, 0.85)',
            backdropFilter: 'blur(6px)',
            zIndex: 1001,
            color: '#ffffff',
            textAlign: 'center',
            padding: '1.5rem',
          }}
        >
          <Compass size={40} color="#38bdf8" strokeWidth={1.5} />
          <span style={{ fontSize: '1rem', fontWeight: 800, color: '#ffffff' }}>
            No Flight Sectors Ingested
          </span>
          <span style={{ fontSize: '0.78rem', color: '#a1a1aa', maxWidth: '340px', lineHeight: 1.45 }}>
            {isOpsOrAdmin
              ? 'Upload your sectorised KML / KMZ file from QGIS or Google Earth to render real-world flight grids.'
              : 'Sectors will appear on the satellite map once uploaded by LATRICS Operations.'}
          </span>
          {isOpsOrAdmin && onOpenUploadKml && (
            <button
              onClick={onOpenUploadKml}
              style={{
                marginTop: '0.5rem',
                padding: '0.55rem 1.25rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                backgroundColor: '#ffffff',
                color: '#09090b',
                border: 'none',
                borderRadius: '7px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              <UploadCloud size={14} />
              Upload Sectorised KML
            </button>
          )}
        </div>
      )}

      {/* Leaflet DOM Node */}
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

      {/* Global CSS for Custom Leaflet Tooltip & Controls */}
      <style jsx global>{`
        .aerostake-map-tooltip {
          background: rgba(9, 9, 11, 0.94) !important;
          backdrop-filter: blur(8px) !important;
          border: 1px solid rgba(255, 255, 255, 0.25) !important;
          border-radius: 6px !important;
          padding: 6px 10px !important;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.6) !important;
        }
        .aerostake-map-tooltip::before {
          border-top-color: rgba(9, 9, 11, 0.94) !important;
        }
        .leaflet-control-zoom {
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          border-radius: 7px !important;
          overflow: hidden !important;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45) !important;
          margin-bottom: 16px !important;
          margin-right: 16px !important;
        }
        .leaflet-control-zoom a {
          background-color: rgba(9, 9, 11, 0.88) !important;
          backdrop-filter: blur(8px) !important;
          color: #ffffff !important;
          border-bottom: 1px solid rgba(255, 255, 255, 0.15) !important;
          width: 30px !important;
          height: 30px !important;
          line-height: 30px !important;
          font-weight: 700 !important;
        }
        .leaflet-control-zoom a:hover {
          background-color: #18181b !important;
          color: #38bdf8 !important;
        }
        .aerostake-sector-label:hover div {
          transform: translate(-50%, -50%) scale(1.1);
          border-color: #38bdf8 !important;
          box-shadow: 0 4px 14px rgba(56, 189, 248, 0.4) !important;
        }
      `}</style>
    </div>
  );
};
