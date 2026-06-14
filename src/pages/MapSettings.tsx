import { useState } from 'react';
import { Map, MapPin, Key, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const GOOGLE_MAPS_API_KEY_STORAGE = 'smart_stock_google_maps_api_key';

interface MapSettingsProps {
  onApiKeyChange?: (key: string) => void;
}

export default function MapSettings({ onApiKeyChange }: MapSettingsProps) {
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem(GOOGLE_MAPS_API_KEY_STORAGE) || '';
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem(GOOGLE_MAPS_API_KEY_STORAGE, apiKey);
      if (onApiKeyChange) {
        onApiKeyChange(apiKey);
      }
      setSaved(true);
      toast.success("Google Maps API key saved successfully!");
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      toast.error("Failed to save API key");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearKey = () => {
    localStorage.removeItem(GOOGLE_MAPS_API_KEY_STORAGE);
    setApiKey('');
    if (onApiKeyChange) {
      onApiKeyChange('');
    }
    toast.success("API key cleared");
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Map className="h-5 w-5" />
          Google Maps Configuration
        </CardTitle>
        <CardDescription>
          Set up Google Maps API to show shop locations on the map
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 flex items-center gap-2">
            <Key className="h-4 w-4" />
            How to get Google Maps API Key:
          </h4>
          <ol className="text-sm text-blue-700 mt-2 space-y-1 list-decimal list-inside">
            <li>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></li>
            <li>Create a new project or select existing one</li>
            <li>Enable "Maps JavaScript API" for your project</li>
            <li>Go to Credentials and create an API key</li>
            <li>Copy the API key and paste it below</li>
          </ol>
        </div>

        <div>
          <Label htmlFor="api-key">Google Maps API Key</Label>
          <div className="flex gap-2 mt-1.5">
            <Input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Google Maps API key"
              className="flex-1"
            />
            <Button
              onClick={handleSave}
              disabled={isSaving || !apiKey.trim()}
              className="gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saved ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Your API key is stored locally in your browser and is never sent to our servers.
          </p>
        </div>

        {apiKey && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-green-600 flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              API key configured
            </p>
            <Button variant="outline" size="sm" onClick={handleClearKey}>
              Clear Key
            </Button>
          </div>
        )}

        <div className="border-t pt-4 mt-4">
          <h4 className="font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Setting Your Shop Location
          </h4>
          <p className="text-sm text-muted-foreground mt-1">
            To appear on the map, set your shop's latitude and longitude in your 
            <a href="/profile" className="underline mx-1">Profile</a> 
            under the Shop tab. You can find your coordinates using any map service or GPS.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function getGoogleMapsApiKey(): string {
  return localStorage.getItem(GOOGLE_MAPS_API_KEY_STORAGE) || '';
}