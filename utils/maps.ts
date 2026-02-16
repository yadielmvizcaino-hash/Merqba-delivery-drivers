import { Coordinates } from '../types';

export const getGoogleMapsUrl = (destination: Coordinates) => {
  return `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`;
};

export const getUnifiedRouteUrl = (
  origin: Coordinates, 
  waypoints: { coords: Coordinates, type: 'pickup' | 'delivery' }[]
) => {
  // Construct the Google Maps URL with waypoints
  // Format: https://www.google.com/maps/dir/?api=1&origin=...&destination=...&waypoints=...
  
  if (waypoints.length === 0) return '';

  const originStr = `${origin.lat},${origin.lng}`;
  const destCoords = waypoints[waypoints.length - 1].coords;
  const destStr = `${destCoords.lat},${destCoords.lng}`;
  
  const waypointsStr = waypoints
    .slice(0, -1) // All except last
    .map(wp => `${wp.coords.lat},${wp.coords.lng}`)
    .join('|');

  let url = `https://www.google.com/maps/dir/?api=1&origin=${originStr}&destination=${destStr}`;
  
  if (waypointsStr) {
    url += `&waypoints=${waypointsStr}`;
  }

  return url;
};

// Mock function to simulate distance calculation
export const calculateDistance = (coord1: Coordinates, coord2: Coordinates) => {
  // Haversine formula placeholder or similar
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(coord2.lat - coord1.lat);
  const dLon = deg2rad(coord2.lng - coord1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(coord1.lat)) * Math.cos(deg2rad(coord2.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d.toFixed(1);
};

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}