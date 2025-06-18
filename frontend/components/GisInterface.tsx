"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import {
    createGeoJsonPolygon,
    getNdviData,
    NdviDataResponse,
} from "../services/api";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Button } from "../components/ui/button";
import { format, subMonths } from "date-fns";
import { TimelineData } from "../lib/timeline-store";
import ChatWindow from "./ai/ChatWindow";
import { Globe } from "lucide-react";
import SidePanel from "./SidePanel";

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
    const [currentTimelineIndex, setCurrentTimelineIndex] = useState(0);
    const [isChatOpen, setChatOpen] = useState(false);

    // Set up default date range (last 3 months to current date)
    const today = new Date();
    const threeMonthsAgo = subMonths(today, 3);

    // Date range state for time series (using proper ISO string format)
    const [startDate, setStartDate] = useState<string>(
        format(threeMonthsAgo, "yyyy-MM-dd")
    );
    const [endDate, setEndDate] = useState<string>(format(today, "yyyy-MM-dd"));
    const [userLocation, setUserLocation] = useState<{
        lat: number;
        lng: number;
    } | null>(null);

    // Create timeline data from NDVI response
    const timelineData = useMemo<TimelineData[]>(() => {
        if (!ndviData?.time_series?.data) return [];

        return ndviData.time_series.data.map((item) => {
            // Find corresponding weather data for the same date
            const weatherData = ndviData.weather?.data.find(
                (weather) => weather.date === item.date
            );

            return {
                date: item.date,
                ndvi: item.ndvi,
                url: item.url,
                temperature: weatherData?.temperature_celsius,
                precipitation: weatherData?.precipitation_mm,
            };
        });
    }, [ndviData]);

    // Get user location on component mount
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    });
                },
                (error) => {
                    console.error("Error getting user location:", error);
                }
            );
        }
    }, []);

    // Add handlers for region selection and timeline changes
    const handleRegionSelect = (region: {
        name: string;
        center: { lat: number; lng: number };
        coordinates: Array<[number, number]>;
    }) => {
        setSelectedRegion(region);
    };

    const handleTimelineChange = (data: TimelineData, index: number) => {
        setCurrentTimelineIndex(index);
    };

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
                const geoJsonPolygon = createGeoJsonPolygon(
                    selectedRegion.coordinates
                );
                const response = await getNdviData(geoJsonPolygon, {
                    start_date: startDate,
                    end_date: endDate,
                    time_series: true,
                    include_weather: true,
                });
                setNdviData(response);
            } catch (err: unknown) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "An unknown error occurred"
                );
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [selectedRegion, startDate, endDate]);

    return (
        <div className="h-screen w-full flex flex-col">
            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="flex-grow relative flex">
                <div className="flex-1 relative">
                    <MapView
                        onRegionSelect={handleRegionSelect}
                        ndviTileUrl={ndviData?.ndvi_tiles?.url}
                        userLocation={userLocation}
                        selectedRegion={selectedRegion}
                        timelineData={timelineData}
                        onTimelineChange={handleTimelineChange}
                        showTimeline={timelineData.length > 0}
                    />
                </div>

                {/* Side Panel */}
                <SidePanel
                    selectedRegion={selectedRegion}
                    timelineData={timelineData}
                    currentTimelineIndex={currentTimelineIndex}
                />

                {/* Floating AI Chat Button */}
                <div className="absolute bottom-4 right-4">
                    <Button
                        onClick={() => setChatOpen(true)}
                        className="rounded-full h-16 w-16"
                    >
                        <Globe size={32} />
                    </Button>
                </div>

                <ChatWindow
                    isOpen={isChatOpen}
                    onClose={() => setChatOpen(false)}
                    selectedRegion={selectedRegion}
                    timelineData={timelineData}
                    currentTimelineIndex={currentTimelineIndex}
                />
            </div>
        </div>
    );
}
