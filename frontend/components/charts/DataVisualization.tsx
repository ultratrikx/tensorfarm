"use client";

import { useState } from "react";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "../../components/ui/tabs";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "../../components/ui/card";
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Line,
    LineChart,
} from "recharts";
import { NdviDataResponse } from "../../services/api";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { DateRangePicker } from "../../components/ui/date-range-picker/date-range-picker";
import { Button } from "../../components/ui/button/index";

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
    ndviData: NdviDataResponse | null;
    loading: boolean;
    error: string | null;
    startDate: string;
    endDate: string;
    currentTimelineIndex?: number;
    onDateChange: (startDate: string, endDate: string) => void;
    onClearRegion?: () => void;
};

export default function DataVisualization({
    selectedRegion,
    ndviData,
    loading,
    error,
    startDate,
    endDate,
    currentTimelineIndex = 0,
    onDateChange,
    onClearRegion,
}: DataVisualizationProps) {
    const [activeDatasets, setActiveDatasets] = useState<
        Record<string, boolean>
    >({
        NDVI: true,
        Temperature: true,
        Rainfall: true,
        "Land Cover": true,
    }); // Toggle dataset visibility

    // Convert string dates to Date objects for the date picker
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startDate ? new Date(startDate) : undefined,
        to: endDate ? new Date(endDate) : undefined,
    });

    // Handle date range changes and propagate to parent
    const handleDateRangeChange = (range: DateRange | undefined) => {
        setDateRange(range);

        if (range?.from) {
            const newStartDate = format(range.from, "yyyy-MM-dd");
            const newEndDate = range.to
                ? format(range.to, "yyyy-MM-dd")
                : newStartDate;
            onDateChange(newStartDate, newEndDate);
        }
    };

    const toggleDataset = (dataset: string) => {
        setActiveDatasets((prev) => ({
            ...prev,
            [dataset]: !prev[dataset],
        }));
    };

    return (
        <div className="h-full w-full p-4 overflow-y-auto scrollable-panel">
            {" "}
            <Card className="w-full mb-4">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <CardTitle>
                                {selectedRegion
                                    ? selectedRegion.name
                                    : "Select a region"}
                            </CardTitle>
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
                        </div>
                        {selectedRegion && onClearRegion && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onClearRegion}
                                className="ml-2"
                            >
                                Clear Region
                            </Button>
                        )}
                    </div>
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
                </TabsList>{" "}
                <TabsContent value="timeSeriesView" className="space-y-4">
                    {/* Date Range Picker */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Date Range Selection</CardTitle>
                            <CardDescription>
                                Select a time period for the analysis
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <DateRangePicker
                                dateRange={dateRange}
                                setDateRange={handleDateRangeChange}
                                className="w-full"
                            />
                        </CardContent>{" "}
                    </Card>

                    {/* Current Timeline Data */}
                    {selectedRegion &&
                        ndviData?.time_series?.data &&
                        ndviData.time_series.data.length > 0 && (
                            <Card className="border-primary/20 bg-primary/5">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                                        Current Timeline Selection
                                    </CardTitle>
                                    <CardDescription>
                                        Data for{" "}
                                        {ndviData.time_series.data[
                                            currentTimelineIndex
                                        ]
                                            ? format(
                                                  new Date(
                                                      ndviData.time_series.data[
                                                          currentTimelineIndex
                                                      ].date
                                                  ),
                                                  "MMMM dd, yyyy"
                                              )
                                            : "N/A"}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                        {ndviData.time_series.data[
                                            currentTimelineIndex
                                        ] && (
                                            <div className="text-center p-3 bg-background/50 rounded-lg">
                                                <div className="text-2xl font-bold text-green-600">
                                                    {ndviData.time_series.data[
                                                        currentTimelineIndex
                                                    ].ndvi.toFixed(3)}
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    NDVI
                                                </div>
                                            </div>
                                        )}

                                        {ndviData.weather?.data.find(
                                            (w) =>
                                                w.date ===
                                                ndviData.time_series?.data[
                                                    currentTimelineIndex
                                                ]?.date
                                        )?.temperature_celsius !==
                                            undefined && (
                                            <div className="text-center p-3 bg-background/50 rounded-lg">
                                                <div className="text-2xl font-bold text-red-500">
                                                    {ndviData.weather.data
                                                        .find(
                                                            (w) =>
                                                                w.date ===
                                                                ndviData
                                                                    .time_series
                                                                    ?.data[
                                                                    currentTimelineIndex
                                                                ]?.date
                                                        )
                                                        ?.temperature_celsius?.toFixed(
                                                            1
                                                        )}
                                                    °C
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    Temperature
                                                </div>
                                            </div>
                                        )}

                                        {ndviData.weather?.data.find(
                                            (w) =>
                                                w.date ===
                                                ndviData.time_series?.data[
                                                    currentTimelineIndex
                                                ]?.date
                                        )?.precipitation_mm !== undefined && (
                                            <div className="text-center p-3 bg-background/50 rounded-lg">
                                                <div className="text-2xl font-bold text-blue-500">
                                                    {ndviData.weather.data
                                                        .find(
                                                            (w) =>
                                                                w.date ===
                                                                ndviData
                                                                    .time_series
                                                                    ?.data[
                                                                    currentTimelineIndex
                                                                ]?.date
                                                        )
                                                        ?.precipitation_mm?.toFixed(
                                                            1
                                                        )}
                                                    mm
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    Precipitation
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {loading && (
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex justify-center items-center p-6">
                                    <Loader2 className="h-8 w-8 animate-spin mr-2" />
                                    <p>Loading data...</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {!loading &&
                    selectedRegion &&
                    ndviData?.time_series?.data &&
                    ndviData.time_series.data.length > 0 ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>Time Series Data</CardTitle>
                                <CardDescription>
                                    Viewing data for {selectedRegion.name} from{" "}
                                    {format(
                                        new Date(startDate),
                                        "MMM dd, yyyy"
                                    )}{" "}
                                    to{" "}
                                    {format(new Date(endDate), "MMM dd, yyyy")}
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
                                                dataKey="date"
                                                allowDuplicatedCategory={false}
                                                tick={{ fontSize: 12 }}
                                            />
                                            <YAxis
                                                tick={{ fontSize: 12 }}
                                                domain={[0, 1]}
                                                label={{
                                                    value: "NDVI Value",
                                                    angle: -90,
                                                    position: "insideLeft",
                                                    style: {
                                                        textAnchor: "middle",
                                                    },
                                                }}
                                            />
                                            <Tooltip
                                                formatter={(value) => [
                                                    Number(value).toFixed(3),
                                                    "NDVI",
                                                ]}
                                                labelFormatter={(label) =>
                                                    `Date: ${label}`
                                                }
                                            />
                                            <Legend />
                                            <Line
                                                type="monotone"
                                                data={
                                                    ndviData?.time_series
                                                        ?.data || []
                                                }
                                                dataKey="ndvi"
                                                name="NDVI"
                                                stroke={chartColors.NDVI}
                                                strokeWidth={2}
                                                dot={{ r: 3 }}
                                                activeDot={{ r: 5 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    ) : !loading && selectedRegion ? (
                        <Card>
                            <CardContent className="pt-6">
                                <p className="text-center text-muted-foreground">
                                    {ndviData
                                        ? "No time series data available for this region and date range"
                                        : "Select a region on the map to view time series data"}
                                </p>
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

                    {/* Weather data section */}
                    {selectedRegion &&
                        ndviData?.weather &&
                        activeDatasets["Temperature"] && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Weather Data</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <h4 className="font-medium">
                                                    Temperature & Precipitation
                                                </h4>
                                            </div>
                                            <div className="h-[150px] w-full">
                                                <ResponsiveContainer
                                                    width="100%"
                                                    height="100%"
                                                >
                                                    <LineChart
                                                        data={
                                                            ndviData.weather
                                                                .data || []
                                                        }
                                                        margin={{
                                                            top: 5,
                                                            right: 20,
                                                            left: 10,
                                                            bottom: 5,
                                                        }}
                                                    >
                                                        <CartesianGrid
                                                            strokeDasharray="3 3"
                                                            opacity={0.1}
                                                        />
                                                        <XAxis
                                                            dataKey="date"
                                                            tick={{
                                                                fontSize: 10,
                                                            }}
                                                        />
                                                        <YAxis
                                                            yAxisId="temp"
                                                            orientation="left"
                                                            stroke={
                                                                chartColors.Temperature
                                                            }
                                                            label={{
                                                                value: "°C",
                                                                position:
                                                                    "insideLeft",
                                                                style: {
                                                                    textAnchor:
                                                                        "middle",
                                                                },
                                                            }}
                                                        />
                                                        <YAxis
                                                            yAxisId="precip"
                                                            orientation="right"
                                                            stroke={
                                                                chartColors.Rainfall
                                                            }
                                                            label={{
                                                                value: "mm",
                                                                position:
                                                                    "insideRight",
                                                                style: {
                                                                    textAnchor:
                                                                        "middle",
                                                                },
                                                            }}
                                                        />
                                                        <Tooltip />
                                                        <Legend />
                                                        <Line
                                                            yAxisId="temp"
                                                            type="monotone"
                                                            dataKey="temperature_celsius"
                                                            name="Temperature (°C)"
                                                            stroke={
                                                                chartColors.Temperature
                                                            }
                                                            activeDot={{ r: 5 }}
                                                        />
                                                        <Line
                                                            yAxisId="precip"
                                                            type="monotone"
                                                            dataKey="precipitation_mm"
                                                            name="Precipitation (mm)"
                                                            stroke={
                                                                chartColors.Rainfall
                                                            }
                                                            activeDot={{ r: 5 }}
                                                        />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                    {/* Land Cover data section */}
                    {selectedRegion &&
                        ndviData?.landcover &&
                        activeDatasets["Land Cover"] && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Land Cover Data</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div>
                                            <h4 className="font-medium mb-2">
                                                Dominant Land Cover:{" "}
                                                {
                                                    ndviData.landcover
                                                        .land_cover
                                                        .dominant_class
                                                }
                                            </h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                {" "}
                                                {Object.entries(
                                                    ndviData.landcover
                                                        .land_cover.classes
                                                ).map(([className, data]) => {
                                                    // Define proper type for the data
                                                    type LandCoverDataType = {
                                                        percentage: number;
                                                        area_hectares: number;
                                                    };
                                                    const landCoverData =
                                                        data as LandCoverDataType;
                                                    return (
                                                        <div
                                                            key={className}
                                                            className="border rounded p-2 text-sm"
                                                        >
                                                            <div className="font-medium">
                                                                {className}
                                                            </div>
                                                            <div className="text-muted-foreground">
                                                                {landCoverData.percentage.toFixed(
                                                                    1
                                                                )}
                                                                % (
                                                                {landCoverData.area_hectares.toFixed(
                                                                    1
                                                                )}{" "}
                                                                ha)
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-medium mb-2">
                                                Vegetation Cover
                                            </h4>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="border rounded p-2 text-sm bg-green-50">
                                                    <div className="font-medium">
                                                        Trees
                                                    </div>
                                                    <div className="text-muted-foreground">
                                                        {ndviData.landcover.vegetation.tree_cover_percent.toFixed(
                                                            1
                                                        )}
                                                        %
                                                    </div>
                                                </div>
                                                <div className="border rounded p-2 text-sm bg-yellow-50">
                                                    <div className="font-medium">
                                                        Non-tree
                                                    </div>
                                                    <div className="text-muted-foreground">
                                                        {ndviData.landcover.vegetation.non_tree_vegetation_percent.toFixed(
                                                            1
                                                        )}
                                                        %
                                                    </div>
                                                </div>
                                                <div className="border rounded p-2 text-sm bg-gray-50">
                                                    <div className="font-medium">
                                                        Non-veg
                                                    </div>
                                                    <div className="text-muted-foreground">
                                                        {ndviData.landcover.vegetation.non_vegetated_percent.toFixed(
                                                            1
                                                        )}
                                                        %
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
