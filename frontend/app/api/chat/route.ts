import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { message, context } = body;

        const {
            selectedRegion,
            currentNdvi,
            temperature,
            precipitation,
            date,
        } = context;

        // Basic prompt engineering
        const prompt = `
The user is asking: "${message}"

Here is the current context from the map:
- Location: ${selectedRegion?.name}
- Date: ${date}
- NDVI: ${currentNdvi?.toFixed(4)}
- Average Temperature: ${temperature?.toFixed(2)}°C
- Precipitation: ${precipitation?.toFixed(2)}mm

Please provide a concise and helpful analysis based on this data. If the user asks a general question, answer it in the context of the provided data.
`;

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content:
                        "You are an expert agricultural and environmental analyst.",
                },
                { role: "user", content: prompt },
            ],
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
