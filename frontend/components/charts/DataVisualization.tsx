"use client";

import { useState } from "react";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "../ui/tabs";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import { TimelineData } from "../../lib/timeline-store";
import { format, parseISO } from "date-fns";

interface DataVisualizationProps {
    data: TimelineData[];
}

export default function DataVisualization({ data }: DataVisualizationProps) {
    const [activeTab, setActiveTab] = useState("ndvi");

    const formattedData = data.map(item => ({
        ...item,
        formattedDate: format(parseISO(item.date), 'MMM d'),
    }));

    return (
        <Tabs defaultValue="ndvi" className="w-full" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="ndvi">NDVI</TabsTrigger>
                <TabsTrigger value="temperature">Temperature</TabsTrigger>
                <TabsTrigger value="precipitation">Precipitation</TabsTrigger>
            </TabsList>

            <TabsContent value="ndvi">
                <div className="h-[200px] mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={formattedData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="formattedDate" />
                            <YAxis domain={[0, 1]} />
                            <Tooltip />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="ndvi"
                                stroke="#22c55e"
                                name="NDVI"
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </TabsContent>

            <TabsContent value="temperature">
                <div className="h-[200px] mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={formattedData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="formattedDate" />
                            <YAxis unit="°C" />
                            <Tooltip />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="temperature"
                                stroke="#ef4444"
                                name="Temperature"
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </TabsContent>

            <TabsContent value="precipitation">
                <div className="h-[200px] mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={formattedData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="formattedDate" />
                            <YAxis unit="mm" />
                            <Tooltip />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="precipitation"
                                stroke="#3b82f6"
                                name="Precipitation"
                                dot={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </TabsContent>
        </Tabs>
    );
}
