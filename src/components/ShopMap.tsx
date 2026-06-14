import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface ShopMarker {
  id: string;
  name: string;
  owner?: string;
  address?: string;
  phone?: string;
  latitude: number;
  longitude: number;
}

interface ShopMapProps {
  shops: ShopMarker[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  onShopClick?: (shop: ShopMarker) => void;
  showUserLocation?: boolean;
  userLatitude?: number;
  userLongitude?: number;
}

export default function ShopMap({
  shops,
  center = [28.6139, 77.2090], // Default to Delhi, India
  zoom = 12,
  height = '400px',
  onShopClick,
  showUserLocation = false,
  userLatitude,
  userLongitude
}: ShopMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);

  // Fix default marker icons
  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current).setView(center, zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update markers when shops change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    shops.forEach(shop => {
      if (shop.latitude && shop.longitude) {
        const marker = L.marker([shop.latitude, shop.longitude])
          .addTo(map)
          .bindPopup(`
            <div class="p-1">
              <strong class="text-base">${shop.name}</strong>
              ${shop.owner ? `<p class="text-sm text-gray-600">by ${shop.owner}</p>` : ''}
              ${shop.address ? `<p class="text-sm text-gray-600 mt-1">📍 ${shop.address}</p>` : ''}
              ${shop.phone ? `<p class="text-sm text-gray-600">📞 <a href="tel:${shop.phone}">${shop.phone}</a></p>` : ''}
            </div>
          `);

        if (onShopClick) {
          marker.on('click', () => onShopClick(shop));
        }

        markersRef.current.push(marker);
      }
    });

    // Fit bounds if there are shops
    if (shops.length > 0) {
      const validShops = shops.filter(s => s.latitude && s.longitude);
      if (validShops.length > 0) {
        const group = L.featureGroup(markersRef.current);
        map.fitBounds(group.getBounds().pad(0.1));
      }
    }
  }, [shops, onShopClick]);

  // Show user location
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !showUserLocation || !userLatitude || !userLongitude) return;

    const userIcon = L.divIcon({
      className: 'custom-user-marker',
      html: `<div style="width: 16px; height: 16px; background: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    L.marker([userLatitude, userLongitude], { icon: userIcon })
      .addTo(map)
      .bindPopup('Your Location');
  }, [showUserLocation, userLatitude, userLongitude]);

  return (
    <div
      ref={mapRef}
      style={{ height, width: '100%' }}
      className="rounded-lg overflow-hidden"
    />
  );
}
