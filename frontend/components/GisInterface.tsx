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
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { format, subMonths } from "date-fns";
import { TimelineData } from "../lib/timeline-store";
import ChatWindow from "./ai/ChatWindow";
import { Globe, Loader2 } from "lucide-react";
import { Progress } from "./ui/progress";
import { cn } from "../lib/utils";
import DataVisualization from "./charts/DataVisualization";

// Import MapView dynamically with no SSR to avoid Leaflet issues
const MapView = dynamic(() => import("../components/map/MapView"), {
    ssr: false,
    loading: () => (
        <div className="flex h-full w-full items-center justify-center">
            <p>Loading map...</p>
        </div>
    ),
});

const VEGETATION_COLORS = {
    Forest: "bg-emerald-500",
    Grassland: "bg-lime-500",
    Cropland: "bg-yellow-500",
    Wetland: "bg-blue-500",
    Urban: "bg-gray-500",
    Barren: "bg-orange-500",
    Water: "bg-blue-700",
    "Snow/Ice": "bg-slate-200",
} as const;

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
    const [startDate] = useState<string>(format(threeMonthsAgo, "yyyy-MM-dd"));
    const [endDate] = useState<string>(format(today, "yyyy-MM-dd"));
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
                    include_landcover: true,
                    satellite_source: "sentinel-2",
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

    // Pass comprehensive data to ChatWindow
    const chatContextData = useMemo(() => {
        if (!selectedRegion || !ndviData) return null;

        const currentData = timelineData[currentTimelineIndex];
        return {
            region: {
                name: selectedRegion.name,
                coordinates: selectedRegion.coordinates,
                center: selectedRegion.center,
            },
            currentData: {
                date: currentData?.date,
                ndvi: currentData?.ndvi,
                temperature: currentData?.temperature,
                precipitation: currentData?.precipitation,
            },
            timeSeriesSummary: ndviData.time_series?.summary,
            weather: ndviData.weather,
            topography: ndviData.topography,
            landcover: ndviData.landcover,
            satelliteInfo: {
                source: ndviData.ndvi_tiles.satellite,
                startDate,
                endDate,
            },
        };
    }, [
        selectedRegion,
        ndviData,
        timelineData,
        currentTimelineIndex,
        startDate,
        endDate,
    ]);

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
                </div>{" "}
                {/* Side Panel */}{" "}
                <div className="w-1/2 h-screen overflow-hidden bg-background border-l relative">
                    {loading && (
                        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
                            <div className="text-center space-y-4 bg-background/90 p-6 rounded-lg shadow-lg border">
                                <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                                <p className="text-sm font-medium">
                                    Loading data...
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Please wait while we analyze the region
                                </p>
                            </div>
                        </div>
                    )}
                    <Tabs defaultValue="info" className="h-full flex flex-col">
                        <div className="shrink-0 border-b">
                            <TabsList className="w-full">
                                <TabsTrigger value="info" className="flex-1">
                                    Information
                                </TabsTrigger>
                                <TabsTrigger
                                    value="analysis"
                                    className="flex-1"
                                >
                                    Analysis
                                </TabsTrigger>
                            </TabsList>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <TabsContent value="info" className="p-6 space-y-6">
                                <div className="space-y-4">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>
                                                Region Information
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {selectedRegion ? (
                                                <div className="space-y-2">
                                                    <p className="text-sm text-muted-foreground">
                                                        Selected Area
                                                    </p>
                                                    <p className="font-medium">
                                                        {selectedRegion.name}
                                                    </p>
                                                    {timelineData[
                                                        currentTimelineIndex
                                                    ] && (
                                                        <>
                                                            <div className="grid grid-cols-2 gap-4 mt-4">
                                                                <div>
                                                                    <p className="text-sm text-muted-foreground">
                                                                        NDVI
                                                                    </p>
                                                                    <p className="font-medium">
                                                                        {timelineData[
                                                                            currentTimelineIndex
                                                                        ].ndvi?.toFixed(
                                                                            4
                                                                        ) ??
                                                                            "N/A"}
                                                                    </p>
                                                                </div>
                                                                {timelineData[
                                                                    currentTimelineIndex
                                                                ]
                                                                    .temperature !==
                                                                    undefined && (
                                                                    <div>
                                                                        <p className="text-sm text-muted-foreground">
                                                                            Temperature
                                                                        </p>
                                                                        <p className="font-medium">
                                                                            {timelineData[
                                                                                currentTimelineIndex
                                                                            ].temperature?.toFixed(
                                                                                1
                                                                            ) ??
                                                                                "N/A"}
                                                                            °C
                                                                        </p>
                                                                    </div>
                                                                )}
                                                                {timelineData[
                                                                    currentTimelineIndex
                                                                ]
                                                                    .precipitation !==
                                                                    undefined && (
                                                                    <div>
                                                                        <p className="text-sm text-muted-foreground">
                                                                            Precipitation
                                                                        </p>
                                                                        <p className="font-medium">
                                                                            {timelineData[
                                                                                currentTimelineIndex
                                                                            ].precipitation?.toFixed(
                                                                                1
                                                                            ) ??
                                                                                "N/A"}
                                                                            mm
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-muted-foreground">
                                                    Select a region on the map
                                                    to see details
                                                </p>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {ndviData?.landcover && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>
                                                    Land Cover
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-4">
                                                    <div>
                                                        <p className="text-sm text-muted-foreground">
                                                            Dominant Class
                                                        </p>
                                                        <p className="font-medium">
                                                            {
                                                                ndviData
                                                                    .landcover
                                                                    .land_cover
                                                                    .dominant_class
                                                            }
                                                        </p>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-4">
                                                        <div>
                                                            <p className="text-sm text-muted-foreground">
                                                                Tree Cover
                                                            </p>
                                                            <p className="font-medium">
                                                                {
                                                                    ndviData
                                                                        .landcover
                                                                        .vegetation
                                                                        .tree_cover_percent
                                                                }
                                                                %
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-muted-foreground">
                                                                Other Vegetation
                                                            </p>
                                                            <p className="font-medium">
                                                                {
                                                                    ndviData
                                                                        .landcover
                                                                        .vegetation
                                                                        .non_tree_vegetation_percent
                                                                }
                                                                %
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-muted-foreground">
                                                                Non-Vegetated
                                                            </p>
                                                            <p className="font-medium">
                                                                {
                                                                    ndviData
                                                                        .landcover
                                                                        .vegetation
                                                                        .non_vegetated_percent
                                                                }
                                                                %
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>
                            </TabsContent>{" "}
                            <TabsContent
                                value="analysis"
                                className="p-6 space-y-6"
                            >
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {ndviData?.landcover && (
                                        <Card className="lg:col-span-2">
                                            <CardHeader>
                                                <CardTitle>
                                                    Land Cover Analysis
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="grid gap-4 grid-cols-1 md:grid-cols-2">
                                                {Object.entries(
                                                    ndviData.landcover
                                                        .land_cover.classes
                                                ).map(([className, data]) => (
                                                    <div
                                                        key={className}
                                                        className="space-y-2 bg-muted/50 p-3 rounded-lg"
                                                    >
                                                        <div className="flex justify-between items-center">
                                                            <div className="flex items-center gap-2">
                                                                <div
                                                                    className={cn(
                                                                        "w-4 h-4 rounded-full",
                                                                        VEGETATION_COLORS[
                                                                            className as keyof typeof VEGETATION_COLORS
                                                                        ] ||
                                                                            "bg-gray-400"
                                                                    )}
                                                                />
                                                                <span className="text-sm font-medium">
                                                                    {className}
                                                                </span>
                                                            </div>
                                                            <span className="text-sm font-medium">
                                                                {data.percentage.toFixed(
                                                                    1
                                                                )}
                                                                %
                                                            </span>
                                                        </div>
                                                        <Progress
                                                            value={
                                                                data.percentage
                                                            }
                                                            className="h-2"
                                                        >
                                                            <div
                                                                className={cn(
                                                                    "h-full w-full absolute",
                                                                    VEGETATION_COLORS[
                                                                        className as keyof typeof VEGETATION_COLORS
                                                                    ] ||
                                                                        "bg-gray-400"
                                                                )}
                                                            />
                                                        </Progress>
                                                        <p className="text-xs text-muted-foreground">
                                                            Area:{" "}
                                                            {data.area_hectares.toFixed(
                                                                1
                                                            )}{" "}
                                                            ha
                                                        </p>
                                                    </div>
                                                ))}
                                            </CardContent>
                                        </Card>
                                    )}

                                    {selectedRegion &&
                                        timelineData.length > 0 && (
                                            <>
                                                {" "}
                                                <Card className="lg:col-span-2">
                                                    <CardHeader className="pb-2">
                                                        <CardTitle>
                                                            NDVI Trends
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="h-[160px] py-2">
                                                        <DataVisualization
                                                            data={timelineData}
                                                            type="ndvi"
                                                        />
                                                    </CardContent>
                                                </Card>
                                                <Card>
                                                    <CardHeader className="pb-2">
                                                        <CardTitle>
                                                            Temperature Trends
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="h-[180px]">
                                                        <DataVisualization
                                                            data={timelineData}
                                                            type="temperature"
                                                        />
                                                    </CardContent>
                                                </Card>
                                                <Card>
                                                    <CardHeader className="pb-2">
                                                        <CardTitle>
                                                            Precipitation Trends
                                                        </CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="h-[180px]">
                                                        <DataVisualization
                                                            data={timelineData}
                                                            type="precipitation"
                                                        />
                                                    </CardContent>
                                                </Card>
                                            </>
                                        )}
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
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
                    contextData={chatContextData}
                />
            </div>
        </div>
    );
}
