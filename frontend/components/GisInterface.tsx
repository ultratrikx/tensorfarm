"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import DataVisualization from "../components/charts/DataVisualization";

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
                <MapView onRegionSelect={handleRegionSelect} />
            </div>

            {/* Data Visualization (Right Side) */}
            <div className="w-full md:w-1/2 h-1/2 md:h-full">
                <DataVisualization selectedRegion={selectedRegion} />
            </div>
        </div>
    );
}
