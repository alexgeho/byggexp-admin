import apiClient from '../api/apiClient';

const HOUSE_NUMBER_PATTERN =
  /\b(\d+[a-zA-Z]?(?:\/\d+[a-zA-Z]?)?(?:-\d+[a-zA-Z]?)?)\b/;

export const DEFAULT_LOCATION_RADIUS_METERS = 500;
export const MIN_LOCATION_RADIUS_METERS = 50;
export const MAX_LOCATION_RADIUS_METERS = 1500;
export const LOCATION_RADIUS_STEP_METERS = 50;

export const extractHouseNumberFromQuery = (query = '') => {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return '';
  }

  const matches = normalizedQuery.match(new RegExp(HOUSE_NUMBER_PATTERN.source, 'g'));

  if (!matches?.length) {
    return '';
  }

  return matches[matches.length - 1];
};

export const labelIncludesHouseNumber = (label = '', houseNumber = '') => {
  if (!label || !houseNumber) {
    return false;
  }

  return new RegExp(`\\b${houseNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(
    label,
  );
};

export const enrichAddressLabelWithQueryHouseNumber = (label = '', query = '') => {
  const normalizedLabel = label.trim();
  const houseNumber = extractHouseNumberFromQuery(query);

  if (!normalizedLabel || !houseNumber) {
    return normalizedLabel;
  }

  if (labelIncludesHouseNumber(normalizedLabel, houseNumber)) {
    return normalizedLabel;
  }

  const [firstSegment, ...restSegments] = normalizedLabel.split(',');
  const streetLine = firstSegment.trim();

  if (!streetLine || HOUSE_NUMBER_PATTERN.test(streetLine)) {
    return normalizedLabel;
  }

  const enrichedFirstSegment = `${streetLine} ${houseNumber}`;
  return [enrichedFirstSegment, ...restSegments].join(', ').trim();
};

export const reverseGeocodeCoordinate = async (latitude, longitude) => {
  const { data } = await apiClient.get('/projects/geocode/reverse', {
    params: {
      lat: latitude,
      lon: longitude,
    },
  });
  return data?.label || '';
};

export const searchAddressSuggestions = async (query, limit = 8) => {
  const { data } = await apiClient.get('/projects/geocode/search', {
    params: {
      query,
      limit,
    },
  });
  return Array.isArray(data) ? data : [];
};

export const normalizeLocationSuggestions = (matches = []) => {
  const seenLabels = new Set();

  return matches.reduce((suggestions, match, index) => {
    const label = match?.label?.trim?.() || match?.display_name?.trim();
    const latitude = Number(match?.latitude ?? match?.lat);
    const longitude = Number(match?.longitude ?? match?.lon);

    if (
      !label ||
      Number.isNaN(latitude) ||
      Number.isNaN(longitude) ||
      seenLabels.has(label)
    ) {
      return suggestions;
    }

    seenLabels.add(label);
    suggestions.push({
      id: String(match?.id || match?.place_id || `${label}-${index}`),
      label,
      latitude,
      longitude,
    });

    return suggestions;
  }, []);
};
