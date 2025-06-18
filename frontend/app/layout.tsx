import "./globals.css";
import Navigation from "../components/Navigation";

export const metadata = {
    title: "TensorFarm GIS Interface",
    description:
        "A GIS-like interface with interactive maps and data visualization",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                <link
                    rel="stylesheet"
                    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
                    integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
                    crossOrigin=""
                />
                <link
                    rel="stylesheet"
                    href="https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css"
                    crossOrigin=""
                />
            </head>
            <body>
                <Navigation />
                {children}
            </body>
        </html>
    );
}
