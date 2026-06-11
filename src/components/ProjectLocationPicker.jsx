import { useEffect, useRef, useState } from 'react';
import { Input, Slider, Spin } from 'antd';
import { EnvironmentOutlined, SearchOutlined } from '@ant-design/icons';
import AdminDrawer from './AdminDrawer';
import {
  DEFAULT_LOCATION_RADIUS_METERS,
  enrichAddressLabelWithQueryHouseNumber,
  MAX_LOCATION_RADIUS_METERS,
  MIN_LOCATION_RADIUS_METERS,
  LOCATION_RADIUS_STEP_METERS,
  normalizeLocationSuggestions,
  reverseGeocodeCoordinate,
  searchAddressSuggestions,
} from '../utils/projectLocationSearch';

export default function ProjectLocationPicker({ open, onClose, onConfirm, initialValue = null }) {
  const [location, setLocation] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [isLocationSearchLoading, setIsLocationSearchLoading] = useState(false);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [selectedCoordinate, setSelectedCoordinate] = useState(null);
  const [locationRadiusMeters, setLocationRadiusMeters] = useState(DEFAULT_LOCATION_RADIUS_METERS);

  const locationSearchRequestIdRef = useRef(0);
  const isLocationLoadingRef = useRef(false);

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
      ? 'Start typing to search for a project address.'
      : 'No addresses found. Try a more specific search.';

  const showLocationSearchHint =
    locationSearch.trim().length < 2 &&
    !isLocationLoading &&
    !isLocationSearchLoading &&
    !locationSuggestions.length;

  return (
    <AdminDrawer
      open={open}
      onClose={onClose}
      destroyOnClose
      zIndex={1001}
      title="Project address"
      saveText="Choose"
      onSave={handleConfirm}
      saveDisabled={!selectedCoordinate}
      className="project-location-picker"
    >
      <div className="project-location-picker__content">
        <div className="project-location-picker__search-card">
          <SearchOutlined className="project-location-picker__search-icon" />
          <Input
            autoFocus
            value={locationSearch}
            onChange={(event) => setLocationSearch(event.target.value)}
            placeholder="Search address"
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
                  {isLocationLoading ? 'Loading location...' : 'Searching addresses...'}
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

        <div className="project-location-picker__bottom-panel">
          <div className="project-location-picker__bottom-title">Selected location</div>
          <div
            className={[
              'project-location-picker__bottom-location',
              !location && 'project-location-picker__bottom-location--placeholder',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {location || 'Search and choose a project location.'}
          </div>

          <div className="project-location-picker__activation-row">
            <div className="project-location-picker__activation-copy">
              <div className="project-location-picker__activation-title">Activation area</div>
              <div className="project-location-picker__activation-subtitle">
                Upon entry, the timer will start
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
    </AdminDrawer>
  );
}
