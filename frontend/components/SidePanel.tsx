"use client";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { TimelineData } from "../lib/timeline-store";
import DataVisualization from "./charts/DataVisualization";

interface SidePanelProps {
    selectedRegion: { name: string } | null;
    timelineData: TimelineData[];
    currentTimelineIndex: number;
}

export default function SidePanel({
    selectedRegion,
    timelineData,
    currentTimelineIndex,
}: SidePanelProps) {
    const currentData = timelineData[currentTimelineIndex];

    return (
        <div className="w-96 h-full bg-background border-l p-4 space-y-4 overflow-y-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Region Information</CardTitle>
                </CardHeader>
                <CardContent>
                    {selectedRegion ? (
                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">Selected Area</p>
                            <p className="font-medium">{selectedRegion.name}</p>
                            {currentData && (
                                <>
                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <div>
                                            <p className="text-sm text-muted-foreground">NDVI</p>
                                            <p className="font-medium">{currentData.ndvi.toFixed(4)}</p>
                                        </div>
                                        {currentData.temperature !== undefined && (
                                            <div>
                                                <p className="text-sm text-muted-foreground">Temperature</p>
                                                <p className="font-medium">{currentData.temperature.toFixed(1)}°C</p>
                                            </div>
                                        )}
                                        {currentData.precipitation !== undefined && (
                                            <div>
                                                <p className="text-sm text-muted-foreground">Precipitation</p>
                                                <p className="font-medium">{currentData.precipitation.toFixed(1)}mm</p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <p className="text-muted-foreground">Select a region on the map to see details</p>
                    )}
                </CardContent>
            </Card>

            {selectedRegion && timelineData.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Data Visualization</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <DataVisualization data={timelineData} />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
