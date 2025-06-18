"use client";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { TimelineData } from "../lib/timeline-store";
import { NdviDataResponse } from "../services/api";
import DataVisualization from "./charts/DataVisualization";
import { Loader2 } from "lucide-react";
import { Progress } from "../components/ui/progress";
import { cn } from "../lib/utils";

interface SidePanelProps {
    selectedRegion: { name: string } | null;
    timelineData: TimelineData[];
    currentTimelineIndex: number;
    ndviData?: NdviDataResponse;
    isLoading?: boolean;
}

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

export default function SidePanel({
    selectedRegion,
    timelineData,
    currentTimelineIndex,
    ndviData,
    isLoading = false,
}: SidePanelProps) {
    const currentData = timelineData[currentTimelineIndex];

    return (
        <div className="w-1/2 h-full bg-background border-l overflow-hidden flex flex-col relative">
            {isLoading && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="text-center space-y-4 bg-background/90 p-6 rounded-lg shadow-lg border">
                        <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
                        <p className="text-sm font-medium">Loading data...</p>
                        <p className="text-xs text-muted-foreground">
                            Please wait while we analyze the region
                        </p>
                    </div>
                </div>
            )}
            <Tabs defaultValue="info" className="flex-1 flex flex-col h-full">
                <div className="shrink-0 p-4 border-b">
                    <TabsList className="w-full">
                        <TabsTrigger value="info" className="flex-1">
                            Information
                        </TabsTrigger>
                        <TabsTrigger value="analysis" className="flex-1">
                            Analysis
                        </TabsTrigger>
                    </TabsList>
                </div>
                <div className="flex-1 overflow-hidden">
                    <TabsContent
                        value="info"
                        className="h-full p-4 overflow-y-auto"
                    >
                        <div className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Region Information</CardTitle>
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
                                            {currentData && (
                                                <>
                                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                                        <div>
                                                            <p className="text-sm text-muted-foreground">
                                                                NDVI
                                                            </p>
                                                            <p className="font-medium">
                                                                {currentData.ndvi?.toFixed(
                                                                    4
                                                                ) ?? "N/A"}
                                                            </p>
                                                        </div>
                                                        {currentData.temperature !==
                                                            undefined && (
                                                            <div>
                                                                <p className="text-sm text-muted-foreground">
                                                                    Temperature
                                                                </p>
                                                                <p className="font-medium">
                                                                    {currentData.temperature?.toFixed(
                                                                        1
                                                                    ) ?? "N/A"}
                                                                    °C
                                                                </p>
                                                            </div>
                                                        )}
                                                        {currentData.precipitation !==
                                                            undefined && (
                                                            <div>
                                                                <p className="text-sm text-muted-foreground">
                                                                    Precipitation
                                                                </p>
                                                                <p className="font-medium">
                                                                    {currentData.precipitation?.toFixed(
                                                                        1
                                                                    ) ?? "N/A"}
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
                                            Select a region on the map to see
                                            details
                                        </p>
                                    )}
                                </CardContent>
                            </Card>

                            {ndviData?.landcover && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Land Cover</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-sm text-muted-foreground">
                                                    Dominant Class
                                                </p>
                                                <p className="font-medium">
                                                    {
                                                        ndviData.landcover
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
                                                            ndviData.landcover
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
                                                            ndviData.landcover
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
                                                            ndviData.landcover
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
                    </TabsContent>
                    <TabsContent
                        value="analysis"
                        className="h-full p-4 overflow-y-auto"
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
                                            ndviData.landcover.land_cover
                                                .classes
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
                                                    value={data.percentage}
                                                    className="h-2"
                                                >
                                                    <div
                                                        className={cn(
                                                            "h-full w-full absolute",
                                                            VEGETATION_COLORS[
                                                                className as keyof typeof VEGETATION_COLORS
                                                            ] || "bg-gray-400"
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
                            {selectedRegion && timelineData.length > 0 && (
                                <>
                                    <Card className="lg:col-span-2">
                                        <CardHeader>
                                            <CardTitle>NDVI Trends</CardTitle>
                                        </CardHeader>
                                        <CardContent className="h-[250px]">
                                            <DataVisualization
                                                data={timelineData}
                                                type="ndvi"
                                            />
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle>
                                                Temperature Trends
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="h-[250px]">
                                            <DataVisualization
                                                data={timelineData}
                                                type="temperature"
                                            />
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle>
                                                Precipitation Trends
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="h-[250px]">
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
    );
}
