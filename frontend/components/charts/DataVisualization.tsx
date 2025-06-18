"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Line,
    LineChart,
} from "recharts";

// Sample data - in a real app, this would come from an API
const generateData = (
    region: {
        name: string;
        center: { lat: number; lng: number };
        coordinates: Array<[number, number]>;
    },
    dataType: string
) => {
    const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
    ];

    const baseValues: Record<string, number[]> = {
        NDVI: [0.2, 0.25, 0.4, 0.6, 0.7, 0.75, 0.8, 0.75, 0.6, 0.4, 0.3, 0.2],
        Temperature: [5, 7, 10, 15, 20, 25, 27, 26, 22, 15, 10, 6],
        Rainfall: [50, 40, 45, 55, 40, 30, 20, 25, 35, 45, 50, 55],
        "Land Cover": [60, 62, 65, 68, 70, 72, 70, 68, 65, 63, 62, 60],
    };

    // Add some randomness based on region name and polygon size
    const regionFactor = (region.name.length % 5) / 10;
    const polygonFactor =
        region.coordinates.length > 0 ? region.coordinates.length / 50 : 0;
    return months.map((month, index) => ({
        name: month,
        value:
            baseValues[dataType][index] *
            (1 + regionFactor + (polygonFactor || 0)),
    }));
};

// Define chart colors for each data type
const chartColors: Record<string, string> = {
    NDVI: "#4ade80",
    Temperature: "#f87171",
    Rainfall: "#60a5fa",
    "Land Cover": "#a78bfa",
};

type DataVisualizationProps = {
    selectedRegion: {
        name: string;
        center: { lat: number; lng: number };
        coordinates: Array<[number, number]>;
    } | null;
};

export default function DataVisualization({
    selectedRegion,
}: DataVisualizationProps) {
    const [activeDatasets, setActiveDatasets] = useState<
        Record<string, boolean>
    >({
        NDVI: true,
        Temperature: true,
        Rainfall: true,
        "Land Cover": true,
    });

    // Toggle dataset visibility
    const toggleDataset = (dataset: string) => {
        setActiveDatasets((prev) => ({
            ...prev,
            [dataset]: !prev[dataset],
        }));
    };

    // Get all active datasets
    const getActiveDatasets = () => {
        return Object.keys(activeDatasets).filter((key) => activeDatasets[key]);
    };
    return (
        <div className="h-full w-full p-4 overflow-y-auto scrollable-panel">
            <Card className="w-full mb-4">
                <CardHeader>
                    <CardTitle>
                        {selectedRegion
                            ? selectedRegion.name
                            : "Select a region"}
                    </CardTitle>{" "}
                    <CardDescription>
                        {selectedRegion
                            ? `Latitude: ${selectedRegion.center.lat.toFixed(
                                  4
                              )}, Longitude: ${selectedRegion.center.lng.toFixed(
                                  4
                              )}, Area Points: ${
                                  selectedRegion.coordinates.length
                              }`
                            : "Draw a polygon on the map to select a region for analysis"}
                    </CardDescription>
                </CardHeader>
            </Card>

            <Tabs defaultValue="timeSeriesView" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="timeSeriesView">
                        Time Series View
                    </TabsTrigger>
                    <TabsTrigger value="layersView">
                        Layer Management
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="timeSeriesView" className="space-y-4">
                    {selectedRegion ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>Time Series Data</CardTitle>
                                <CardDescription>
                                    Viewing data for {selectedRegion.name} over
                                    the past year
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[350px] w-full">
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >
                                        <LineChart
                                            margin={{
                                                top: 10,
                                                right: 30,
                                                left: 0,
                                                bottom: 0,
                                            }}
                                        >
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                opacity={0.1}
                                            />
                                            <XAxis
                                                dataKey="name"
                                                allowDuplicatedCategory={false}
                                                tick={{ fontSize: 12 }}
                                            />
                                            <YAxis tick={{ fontSize: 12 }} />
                                            <Tooltip />
                                            <Legend />{" "}
                                            {getActiveDatasets().map(
                                                (dataType) => (
                                                    <Line
                                                        key={dataType}
                                                        type="monotone"
                                                        data={generateData(
                                                            selectedRegion,
                                                            dataType
                                                        )}
                                                        dataKey="value"
                                                        name={dataType}
                                                        stroke={
                                                            chartColors[
                                                                dataType
                                                            ]
                                                        }
                                                        strokeWidth={2}
                                                        dot={{ r: 3 }}
                                                        activeDot={{ r: 5 }}
                                                    />
                                                )
                                            )}
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardContent className="pt-6">
                                <p className="text-center text-muted-foreground">
                                    Select a region on the map to view time
                                    series data
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="layersView" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Data Layers</CardTitle>
                            <CardDescription>
                                Toggle visibility of different data layers
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                {Object.keys(activeDatasets).map((dataset) => (
                                    <div
                                        key={dataset}
                                        className={`border rounded-md p-3 cursor-pointer transition-colors ${
                                            activeDatasets[dataset]
                                                ? "bg-primary/10 border-primary/20"
                                                : "bg-background border-border/20"
                                        }`}
                                        onClick={() => toggleDataset(dataset)}
                                    >
                                        <div className="flex items-center space-x-2">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{
                                                    backgroundColor:
                                                        chartColors[dataset],
                                                }}
                                            />
                                            <span>{dataset}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {selectedRegion && getActiveDatasets().length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Active Layers</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {getActiveDatasets().map((dataType) => (
                                        <div
                                            key={dataType}
                                            className="space-y-2"
                                        >
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-medium">
                                                    {dataType}
                                                </h4>
                                                <div
                                                    className="w-3 h-3 rounded-full"
                                                    style={{
                                                        backgroundColor:
                                                            chartColors[
                                                                dataType
                                                            ],
                                                    }}
                                                />
                                            </div>
                                            <div className="h-[100px] w-full">
                                                <ResponsiveContainer
                                                    width="100%"
                                                    height="100%"
                                                >
                                                    <AreaChart
                                                        data={generateData(
                                                            selectedRegion,
                                                            dataType
                                                        )}
                                                    >
                                                        <defs>
                                                            <linearGradient
                                                                id={`gradient-${dataType}`}
                                                                x1="0"
                                                                y1="0"
                                                                x2="0"
                                                                y2="1"
                                                            >
                                                                <stop
                                                                    offset="5%"
                                                                    stopColor={
                                                                        chartColors[
                                                                            dataType
                                                                        ]
                                                                    }
                                                                    stopOpacity={
                                                                        0.8
                                                                    }
                                                                />
                                                                <stop
                                                                    offset="95%"
                                                                    stopColor={
                                                                        chartColors[
                                                                            dataType
                                                                        ]
                                                                    }
                                                                    stopOpacity={
                                                                        0.1
                                                                    }
                                                                />
                                                            </linearGradient>
                                                        </defs>
                                                        <XAxis
                                                            dataKey="name"
                                                            tick={{
                                                                fontSize: 10,
                                                            }}
                                                            tickLine={false}
                                                            axisLine={false}
                                                        />
                                                        <Area
                                                            type="monotone"
                                                            dataKey="value"
                                                            stroke={
                                                                chartColors[
                                                                    dataType
                                                                ]
                                                            }
                                                            fillOpacity={1}
                                                            fill={`url(#gradient-${dataType})`}
                                                        />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
