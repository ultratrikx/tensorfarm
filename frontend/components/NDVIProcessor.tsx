"use client";

import { useState } from "react";
import Image from "next/image";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Alert } from "./ui/alert";

export default function NDVIProcessor() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
            setProcessedImageUrl(null);
            setError(null);
        }
    };

    const processImage = async () => {
        if (!selectedFile) {
            setError("Please select an image first");
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const formData = new FormData();
            formData.append("file", selectedFile);

            const response = await fetch("http://localhost:8000/api/process-ndvi", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Failed to process image");
            }

            const blob = await response.blob();
            const imageUrl = URL.createObjectURL(blob);
            setProcessedImageUrl(imageUrl);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto mb-8">
            <Card className="p-6">
                <div className="space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold mb-2">Upload NDVI Image</h2>
                        <p className="text-sm text-gray-500 mb-4">
                            Upload a raw NDVI image where the red channel contains NDVI values (0-255).
                            The image will be processed and colored using a standard NDVI colormap.
                        </p>
                        <div className="flex gap-4 items-center">
                            <Input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="flex-1"
                            />
                            <Button onClick={processImage} disabled={!selectedFile || loading}>
                                {loading ? "Processing..." : "Process Image"}
                            </Button>
                        </div>
                    </div>

                    {error && <Alert variant="destructive">{error}</Alert>}

                    <div className="space-y-6 overflow-y-auto max-h-[70vh] pr-2">
                        {selectedFile && (
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-medium mb-2">Original Image</h3>
                                    <div className="border rounded-lg overflow-hidden">
                                        <div className="relative w-full" style={{ maxHeight: "50vh" }}>
                                            <Image
                                                src={URL.createObjectURL(selectedFile)}
                                                alt="Original NDVI"
                                                width={800}
                                                height={600}
                                                className="w-full h-auto"
                                                style={{ objectFit: "contain", maxHeight: "50vh" }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {processedImageUrl && (
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-medium mb-2">Processed NDVI Image</h3>
                                    <div className="border rounded-lg overflow-hidden">
                                        <div className="relative w-full" style={{ maxHeight: "50vh" }}>
                                            <Image
                                                src={processedImageUrl}
                                                alt="Processed NDVI"
                                                width={800}
                                                height={600}
                                                className="w-full h-auto"
                                                style={{ objectFit: "contain", maxHeight: "50vh" }}
                                            />
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-2">
                                        Color scale: Red (low NDVI) → Yellow (moderate) → Green (high NDVI)
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
}
