import { useCallback, useState } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { Loader2 } from 'lucide-react';

interface ShopMarker {
  id: string;
  name: string;
  owner?: string;
  address?: string;
  phone?: string;
  latitude: number;
  longitude: number;
}

interface GoogleMapsProps {
  shops: ShopMarker[];
  apiKey?: string;
  height?: string;
  onShopClick?: (shop: ShopMarker) => void;
  showUserLocation?: boolean;
  userLatitude?: number;
  userLongitude?: number;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: 28.6139,
  lng: 77.2090,
};

const options = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
};

export default function GoogleMaps({
  shops,
  apiKey = '',
  height = '400px',
  onShopClick,
  showUserLocation = false,
  userLatitude,
  userLongitude
}: GoogleMapsProps) {
  const [selectedShop, setSelectedShop] = useState<ShopMarker | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
  });

  const onMarkerClick = useCallback((shop: ShopMarker) => {
    setSelectedShop(shop);
    if (onShopClick) {
      onShopClick(shop);
    }
  }, [onShopClick]);

  if (loadError) {
    return (
      <div className="flex items-center justify-center bg-muted rounded-lg" style={{ height }}>
        <p className="text-destructive">Error loading Google Maps</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center bg-muted rounded-lg" style={{ height }}>
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  const validShops = shops.filter(s => s.latitude && s.longitude && !isNaN(s.latitude) && !isNaN(s.longitude));
  
  const center = validShops.length > 0
    ? { lat: validShops[0].latitude, lng: validShops[0].longitude }
    : defaultCenter;

  const userCenter = showUserLocation && userLatitude && userLongitude
    ? { lat: userLatitude, lng: userLongitude }
    : null;

  return (
    <div className="rounded-lg overflow-hidden" style={{ height }}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={userCenter || center}
        zoom={12}
        options={options}
      >
        {validShops.map((shop) => (
          <Marker
            key={shop.id}
            position={{ lat: shop.latitude, lng: shop.longitude }}
            onClick={() => onMarkerClick(shop)}
            title={shop.name}
          />
        ))}

        {selectedShop && (
          <InfoWindow
            position={{ lat: selectedShop.latitude, lng: selectedShop.longitude }}
            onCloseClick={() => setSelectedShop(null)}
          >
            <div className="p-2 min-w-[200px]">
              <h3 className="font-semibold text-base">{selectedShop.name}</h3>
              {selectedShop.owner && (
                <p className="text-sm text-gray-600">by {selectedShop.owner}</p>
              )}
              {selectedShop.address && (
                <p className="text-sm text-gray-600 mt-1">📍 {selectedShop.address}</p>
              )}
              {selectedShop.phone && (
                <p className="text-sm text-gray-600">
                  📞 <a href={`tel:${selectedShop.phone}`}>{selectedShop.phone}</a>
                </p>
              )}
            </div>
          </InfoWindow>
        )}

        {showUserLocation && userLatitude && userLongitude && (
          <Marker
            position={{ lat: userLatitude, lng: userLongitude }}
            icon={{
              url: 'data:image/svg+xml,' + encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#3b82f6" stroke="white" stroke-width="2">
                  <circle cx="12" cy="12" r="8"/>
                </svg>
              `),
              scaledSize: new google.maps.Size(32, 32),
            }}
            title="Your Location"
          />
        )}
      </GoogleMap>
    </div>
  );
}