'use client';

import { useEffect, useRef, useState } from 'react';
import { Input, Slider, Spin } from 'antd';
import { EnvironmentOutlined, SearchOutlined } from '@ant-design/icons';
import 'leaflet/dist/leaflet.css';
import AdminModal from '@/src/shared/components/AdminModal';
import { useT } from '@/src/i18n/LanguageProvider';
import {
  DEFAULT_LOCATION_RADIUS_METERS,
  enrichAddressLabelWithQueryHouseNumber,
  MAX_LOCATION_RADIUS_METERS,
  MIN_LOCATION_RADIUS_METERS,
  LOCATION_RADIUS_STEP_METERS,
  normalizeLocationSuggestions,
  reverseGeocodeCoordinate,
  searchAddressSuggestions,
} from '@/src/utils/projectLocationSearch';

// Map falls back to central Stockholm at a country-ish zoom until a location is
// chosen, so an empty picker still shows a sensible map rather than the ocean.
const FALLBACK_CENTER = [59.3293, 18.0686];
const FALLBACK_ZOOM = 5;
const LOCATED_ZOOM = 15;

export default function ProjectLocationPicker({ open, onClose, onConfirm, initialValue = null }) {
  const t = useT();
  const [location, setLocation] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [isLocationSearchLoading, setIsLocationSearchLoading] = useState(false);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [selectedCoordinate, setSelectedCoordinate] = useState(null);
  const [locationRadiusMeters, setLocationRadiusMeters] = useState(DEFAULT_LOCATION_RADIUS_METERS);

  const locationSearchRequestIdRef = useRef(0);
  const isLocationLoadingRef = useRef(false);

  // Leaflet map handles. The map is created imperatively (dynamic import, so it
  // never touches `window` during SSR) and the pin/circle are moved via refs.
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);
  const leafletRef = useRef(null);
  const resizeObserverRef = useRef(null);
  // Latest map-click/drag handler, so the one-time init effect always calls the
  // current closure (with fresh state) without re-initialising the map.
  const onPickRef = useRef(() => {});

  useEffect(() => {
    if (!open) {
      return;
    }

    setLocation(initialValue?.location || '');
    setLocationSearch(initialValue?.location || '');
    setLocationSuggestions([]);
    setIsLocationSearchLoading(false);
    setIsLocationLoading(false);
    setSelectedCoordinate(
      initialValue?.latitude != null && initialValue?.longitude != null
        ? {
            latitude: initialValue.latitude,
            longitude: initialValue.longitude,
          }
        : null,
    );
    setLocationRadiusMeters(initialValue?.radiusMeters ?? DEFAULT_LOCATION_RADIUS_METERS);
  }, [open, initialValue]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const normalizedQuery = locationSearch.trim();
    if (normalizedQuery.length < 2) {
      locationSearchRequestIdRef.current += 1;
      setLocationSuggestions([]);
      setIsLocationSearchLoading(false);
      return undefined;
    }

    const debounceId = setTimeout(async () => {
      const requestId = ++locationSearchRequestIdRef.current;
      setIsLocationSearchLoading(true);

      try {
        const matches = await searchAddressSuggestions(normalizedQuery, 2);
        const nextSuggestions = normalizeLocationSuggestions(matches).map((suggestion) => ({
          ...suggestion,
          label: enrichAddressLabelWithQueryHouseNumber(suggestion.label, normalizedQuery),
        }));

        if (locationSearchRequestIdRef.current === requestId) {
          setLocationSuggestions(nextSuggestions);
        }
      } catch (error) {
        if (locationSearchRequestIdRef.current === requestId) {
          setLocationSuggestions([]);
        }
        console.error('Failed to search project addresses:', error);
      } finally {
        if (locationSearchRequestIdRef.current === requestId) {
          setIsLocationSearchLoading(false);
        }
      }
    }, 250);

    return () => clearTimeout(debounceId);
  }, [open, locationSearch]);

  const setLocationLoadingState = (value) => {
    isLocationLoadingRef.current = value;
    setIsLocationLoading(value);
  };

  const applyResolvedLocation = async (latitude, longitude, resolvedAddressText) => {
    setSelectedCoordinate({ latitude, longitude });

    if (resolvedAddressText) {
      setLocation(resolvedAddressText);
      setLocationSearch(resolvedAddressText);
      return;
    }

    try {
      const resolvedAddress = await reverseGeocodeCoordinate(latitude, longitude);
      if (resolvedAddress) {
        setLocation(resolvedAddress);
        setLocationSearch(resolvedAddress);
        return;
      }
    } catch (error) {
      console.error('Failed to reverse geocode location:', error);
    }

    const fallbackAddress = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    setLocation(fallbackAddress);
    setLocationSearch(fallbackAddress);
  };

  // Clicking the map or dragging the pin picks that point (then reverse-geocodes
  // it to an address). Kept in a ref so the init-once effect always runs the
  // current closure.
  useEffect(() => {
    onPickRef.current = (latitude, longitude) => {
      void applyResolvedLocation(latitude, longitude);
    };
  });

  // Create the Leaflet map once per open. Dynamic import keeps Leaflet
  // (which touches `window`) out of the server bundle. A custom div-pin avoids
  // Leaflet's broken default marker-image paths under bundlers.
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;

    (async () => {
      const leafletModule = await import('leaflet');
      const L = leafletModule.default ?? leafletModule;
      if (cancelled || !mapContainerRef.current || mapRef.current) return;
      leafletRef.current = L;

      const map = L.map(mapContainerRef.current, {
        center: FALLBACK_CENTER,
        zoom: FALLBACK_ZOOM,
        zoomControl: true,
      });
      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);

      const icon = L.divIcon({
        className: 'project-location-picker__pin',
        html: '<span class="project-location-picker__pin-dot"></span>',
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      const marker = L.marker(FALLBACK_CENTER, { draggable: true, icon, opacity: 0 }).addTo(map);
      markerRef.current = marker;
      const circle = L.circle(FALLBACK_CENTER, {
        radius: locationRadiusMeters,
        color: '#2683f9',
        weight: 1.5,
        fillColor: '#2683f9',
        fillOpacity: 0,
        opacity: 0,
      }).addTo(map);
      circleRef.current = circle;

      map.on('click', (event) => onPickRef.current(event.latlng.lat, event.latlng.lng));
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        onPickRef.current(pos.lat, pos.lng);
      });

      // The modal opens with an animation, so the map container starts at zero /
      // wrong size and a single timed invalidateSize can fire too early — leaving
      // grey unrendered tiles until the user reloads. A ResizeObserver re-lays-out
      // the moment the container reaches its real box, however long that takes.
      if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
        const ro = new ResizeObserver(() => {
          if (!cancelled && mapRef.current) mapRef.current.invalidateSize();
        });
        ro.observe(mapContainerRef.current);
        resizeObserverRef.current = ro;
      }
      // Fallback for the (rare) case the box never changes size after init.
      setTimeout(() => {
        if (!cancelled && mapRef.current) mapRef.current.invalidateSize();
      }, 60);
    })();

    return () => {
      cancelled = true;
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
      circleRef.current = null;
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Move the pin + activation circle to the selected point (from search, click
  // or drag) and recentre; hide them entirely until a point is chosen.
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    const circle = circleRef.current;
    if (!map || !marker || !circle) return;

    if (!selectedCoordinate) {
      marker.setOpacity(0);
      circle.setStyle({ opacity: 0, fillOpacity: 0 });
      return;
    }

    const pos = [selectedCoordinate.latitude, selectedCoordinate.longitude];
    marker.setLatLng(pos);
    marker.setOpacity(1);
    circle.setLatLng(pos);
    circle.setStyle({ opacity: 1, fillOpacity: 0.12 });
    map.setView(pos, Math.max(map.getZoom() || 0, LOCATED_ZOOM));
  }, [selectedCoordinate]);

  // Keep the activation circle in sync with the radius slider.
  useEffect(() => {
    if (circleRef.current) circleRef.current.setRadius(locationRadiusMeters);
  }, [locationRadiusMeters]);

  const handleSelectLocationSuggestion = async (suggestion) => {
    if (isLocationLoadingRef.current) {
      return;
    }

    setLocationLoadingState(true);
    try {
      await applyResolvedLocation(
        suggestion.latitude,
        suggestion.longitude,
        suggestion.label,
      );
    } finally {
      setLocationLoadingState(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedCoordinate) {
      return;
    }

    onConfirm({
      location,
      locationLatitude: selectedCoordinate.latitude,
      locationLongitude: selectedCoordinate.longitude,
      locationRadiusMeters,
    });
    onClose();
  };

  const locationSearchEmptyText =
    locationSearch.trim().length < 2
      ? t('Start typing to search for a project address.')
      : t('No addresses found. Try a more specific search.');

  const showLocationSearchHint =
    locationSearch.trim().length < 2 &&
    !isLocationLoading &&
    !isLocationSearchLoading &&
    !locationSuggestions.length;

  return (
    <AdminModal
      open={open}
      onCancel={onClose}
      destroyOnHidden
      zIndex={1001}
      title={t('Project address')}
      saveText={t('Choose')}
      onSave={handleConfirm}
      saveDisabled={!selectedCoordinate}
      className="project-location-picker"
      width={920}
    >
      <div className="project-location-picker__content">
        <div className="project-location-picker__search-card">
          <SearchOutlined className="project-location-picker__search-icon" />
          <Input
            autoFocus
            value={locationSearch}
            onChange={(event) => setLocationSearch(event.target.value)}
            placeholder={t('Search address')}
            variant="borderless"
            className="project-location-picker__search-input"
          />
        </div>

        {showLocationSearchHint ? (
          <div className="project-location-picker__empty-state">
            <span>{locationSearchEmptyText}</span>
          </div>
        ) : (
          <div className="project-location-picker__suggestions-card">
            {isLocationLoading || isLocationSearchLoading ? (
              <div className="project-location-picker__loading-row">
                <Spin size="small" />
                <span>
                  {isLocationLoading ? t('Loading location...') : t('Searching addresses...')}
                </span>
              </div>
            ) : locationSuggestions.length ? (
              locationSuggestions.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={[
                    'project-location-picker__suggestion-item',
                    index === locationSuggestions.length - 1 &&
                      'project-location-picker__suggestion-item--last',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => handleSelectLocationSuggestion(item)}
                >
                  <EnvironmentOutlined />
                  <span>{item.label}</span>
                </button>
              ))
            ) : (
              <div className="project-location-picker__empty-state">
                <span>{locationSearchEmptyText}</span>
              </div>
            )}
          </div>
        )}

        <div className="project-location-picker__map-wrap">
          <div ref={mapContainerRef} className="project-location-picker__map" />
          <div className="project-location-picker__map-hint">
            {t('Click the map or drag the pin to adjust.')}
          </div>
        </div>

        <div className="project-location-picker__bottom-panel">
          <div className="project-location-picker__bottom-title">{t('Selected location')}</div>
          <div
            className={[
              'project-location-picker__bottom-location',
              !location && 'project-location-picker__bottom-location--placeholder',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {location || t('Search and choose a project location.')}
          </div>

          <div className="project-location-picker__activation-row">
            <div className="project-location-picker__activation-copy">
              <div className="project-location-picker__activation-title">{t('Activation area')}</div>
              <div className="project-location-picker__activation-subtitle">
                {t('Upon entry, the timer will start')}
              </div>
            </div>
            <div className="project-location-picker__activation-badge">
              {locationRadiusMeters} m
            </div>
          </div>

          <Slider
            min={MIN_LOCATION_RADIUS_METERS}
            max={MAX_LOCATION_RADIUS_METERS}
            step={LOCATION_RADIUS_STEP_METERS}
            value={locationRadiusMeters}
            onChange={setLocationRadiusMeters}
            className="project-location-picker__slider"
          />
        </div>
      </div>
    </AdminModal>
  );
}
