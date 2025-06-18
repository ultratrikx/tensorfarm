"use client";
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
    type: "ndvi" | "temperature" | "precipitation";
}

export default function DataVisualization({
    data,
    type,
}: DataVisualizationProps) {
    const formattedData = data.map((item) => ({
        ...item,
        formattedDate: format(parseISO(item.date), "MMM d"),
    }));

    const chartConfig = {
        ndvi: {
            dataKey: "ndvi",
            stroke: "#22c55e",
            name: "NDVI",
            domain: [0, 1] as [number, number],
            unit: "",
        },
        temperature: {
            dataKey: "temperature",
            stroke: "#ef4444",
            name: "Temperature",
            domain: ["auto", "auto"] as ["auto", "auto"],
            unit: "°C",
        },
        precipitation: {
            dataKey: "precipitation",
            stroke: "#3b82f6",
            name: "Precipitation",
            domain: ["auto", "auto"] as ["auto", "auto"],
            unit: "mm",
        },
    };

    const config = chartConfig[type];

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="formattedDate" />
                <YAxis domain={config.domain} unit={config.unit} />
                <Tooltip />
                <Legend />
                <Line
                    type="monotone"
                    dataKey={config.dataKey}
                    stroke={config.stroke}
                    name={config.name}
                    dot={false}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}
