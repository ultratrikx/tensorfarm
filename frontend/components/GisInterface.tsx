"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import DataVisualization from "../components/charts/DataVisualization";
import {
    createGeoJsonPolygon,
    getNdviData,
    NdviDataResponse,
    GeoJsonPolygon,
} from "../services/api";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { Loader2 } from "lucide-react";

// Import MapView dynamically with no SSR to avoid Leaflet issues
const MapView = dynamic(() => import("../components/map/MapView"), {
    ssr: false,
    loading: () => (
        <div className="flex h-full w-full items-center justify-center">
            <p>Loading map...</p>
        </div>
    ),
});

export default function GisInterface() {
    const [selectedRegion, setSelectedRegion] = useState<{
        name: string;
        center: { lat: number; lng: number };
        coordinates: Array<[number, number]>;
    } | null>(null);

    const [ndviData, setNdviData] = useState<NdviDataResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch data when a region is selected
    useEffect(() => {
        async function fetchData() {
            if (!selectedRegion || selectedRegion.coordinates.length === 0) {
                setNdviData(null);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                // Convert coordinates to GeoJSON format
                const geoJsonPolygon = createGeoJsonPolygon(
                    selectedRegion.coordinates
                );

                // Fetch data from API
                const data = await getNdviData(geoJsonPolygon, {
                    time_series: true,
                    include_weather: true,
                    include_landcover: true,
                });

                setNdviData(data);
            } catch (err) {
                console.error("Error fetching NDVI data:", err);
                setError(
                    err instanceof Error ? err.message : "Failed to fetch data"
                );
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [selectedRegion]);
    const handleRegionSelect = (region: {
        name: string;
        center: { lat: number; lng: number };
        coordinates: Array<[number, number]>;
    }) => {
        // Only update if we have valid coordinates
        if (region.coordinates.length > 0) {
            setSelectedRegion(region);
        } else {
            setSelectedRegion(null);
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-screen w-full">
            {/* Map View (Left Side) */}
            <div className="w-full md:w-1/2 h-1/2 md:h-full border-r border-border">
                <MapView
                    onRegionSelect={handleRegionSelect}
                    ndviTileUrl={ndviData?.ndvi_tiles?.url}
                />

                {/* Loading or error overlay */}
                {loading && (
                    <div className="absolute top-4 left-4 bg-background/80 p-3 rounded-md shadow-md z-50 flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading data...</span>
                    </div>
                )}

                {error && (
                    <div className="absolute top-4 left-4 z-50">
                        <Alert variant="destructive" className="w-auto">
                            <AlertDescription>{error}</AlertDescription>
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                onClick={() => setError(null)}
                            >
                                Dismiss
                            </Button>
                        </Alert>
                    </div>
                )}
            </div>

            {/* Data Visualization (Right Side) */}
            <div className="w-full md:w-1/2 h-1/2 md:h-full">
                <DataVisualization
                    selectedRegion={selectedRegion}
                    ndviData={ndviData}
                    loading={loading}
                    error={error}
                />
            </div>
        </div>
    );
}
