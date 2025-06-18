import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

interface WeatherData {
    date: string;
    temperature_celsius?: number;
    precipitation_mm?: number;
}

interface LandCoverClass {
    percentage: number;
    area_hectares: number;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { message, context, messageHistory } = body;

        const landCoverSummary = context.landcover
            ? `
Land Cover:
- Dominant class: ${context.landcover.land_cover.dominant_class}
- Tree cover: ${context.landcover.vegetation.tree_cover_percent.toFixed(1)}%
- Non-tree vegetation: ${context.landcover.vegetation.non_tree_vegetation_percent.toFixed(
                  1
              )}%
- Non-vegetated: ${context.landcover.vegetation.non_vegetated_percent.toFixed(
                  1
              )}%

Detailed land cover classes:
${Object.entries(context.landcover.land_cover.classes)
    .map((entry) => {
        const [className, data] = entry as [string, LandCoverClass];
        return `- ${className}: ${data.percentage.toFixed(
            1
        )}% (${data.area_hectares.toFixed(1)} ha)`;
    })
    .join("\n")}
`
            : "";

        const topographySummary = context.topography
            ? `
 Topography:
- Elevation: ${context.topography.elevation.min_meters.toFixed(
                  0
              )}-${context.topography.elevation.max_meters.toFixed(
                  0
              )}m (avg: ${context.topography.elevation.mean_meters.toFixed(0)}m)
- Slope: ${context.topography.slope.min_degrees.toFixed(
                  1
              )}-${context.topography.slope.max_degrees.toFixed(
                  1
              )}° (avg: ${context.topography.slope.mean_degrees.toFixed(1)}°)
`
            : "";

        const weatherStats = context.weather
            ? {
                  avgTemp:
                      context.weather.data.reduce(
                          (sum: number, d: WeatherData) =>
                              sum + (d.temperature_celsius || 0),
                          0
                      ) / context.weather.data.length,
                  totalPrecip: context.weather.data.reduce(
                      (sum: number, d: WeatherData) =>
                          sum + (d.precipitation_mm || 0),
                      0
                  ),
              }
            : null;

        const ndviTrends = context.timeSeriesSummary
            ? `
NDVI Trends:
- Minimum: ${context.timeSeriesSummary.min_ndvi?.toFixed(4) || "N/A"}
- Maximum: ${context.timeSeriesSummary.max_ndvi?.toFixed(4) || "N/A"}
- Average: ${context.timeSeriesSummary.mean_ndvi?.toFixed(4) || "N/A"}
`
            : "";

        const prompt = `
You are analyzing an area in ${context.region.name}. The analysis is based on ${
            context.satelliteInfo.source
        } satellite data from ${context.satelliteInfo.startDate} to ${
            context.satelliteInfo.endDate
        }.

Current Conditions (as of ${context.currentData.date}):
- NDVI: ${context.currentData.ndvi?.toFixed(4)}
- Temperature: ${context.currentData.temperature?.toFixed(2)}°C
- Precipitation: ${context.currentData.precipitation?.toFixed(2)}mm

${ndviTrends}

Climate Summary for the Period:
${
    weatherStats
        ? `- Average Temperature: ${weatherStats.avgTemp.toFixed(2)}°C
- Total Precipitation: ${weatherStats.totalPrecip.toFixed(1)}mm`
        : ""
}

${topographySummary}
${landCoverSummary}

The user is asking: "${message}"

Please provide a detailed analysis based on all this data. Consider the relationships between NDVI, weather patterns, land cover, and topography in your response. If the user asks a specific question, focus on that while incorporating relevant context from the available data.

Previous conversation context:
${(messageHistory as ChatMessage[])
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join("\n")}
`;

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo-16k",
            messages: [
                {
                    role: "system",
                    content:
                        "You are an expert agricultural and environmental analyst with deep knowledge of remote sensing, vegetation indices, weather patterns, and land use. Provide detailed, scientific analysis while keeping explanations accessible.",
                },
                { role: "user", content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 1000,
        });

        const assistantMessage = completion.choices[0].message.content;

        return NextResponse.json({ message: assistantMessage });
    } catch (error) {
        console.error("Error in chat API:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
