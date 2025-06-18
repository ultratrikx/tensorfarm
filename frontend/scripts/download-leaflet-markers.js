import fs from "fs";
import path from "path";
import https from "https";

const LEAFLET_MARKER_URLS = [
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
];

const leafletDir = path.join(process.cwd(), "public", "leaflet");

// Ensure the directory exists
if (!fs.existsSync(leafletDir)) {
    fs.mkdirSync(leafletDir, { recursive: true });
}

// Download each marker image
LEAFLET_MARKER_URLS.forEach((url) => {
    const filename = path.basename(url);
    const filePath = path.join(leafletDir, filename);

    https
        .get(url, (response) => {
            const fileStream = fs.createWriteStream(filePath);
            response.pipe(fileStream);

            fileStream.on("finish", () => {
                fileStream.close();
                console.log(`Downloaded ${filename}`);
            });
        })
        .on("error", (err) => {
            console.error(`Error downloading ${filename}:`, err.message);
        });
});

console.log("Leaflet marker download script complete");
