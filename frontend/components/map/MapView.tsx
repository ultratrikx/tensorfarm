"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import { motion } from "framer-motion";
import TimelineBar from "./TimelineBar";
import { TimelineData } from "../../lib/timeline-store";

// Import the draw plugin
import "leaflet-draw";

type MapViewProps = {
    onRegionSelect: (region: {
        name: string;
        center: { lat: number; lng: number };
        coordinates: Array<[number, number]>;
    }) => void;
    ndviTileUrl?: string;
    userLocation?: { lat: number; lng: number } | null;
    selectedRegion?: {
        name: string;
        center: { lat: number; lng: number };
        coordinates: Array<[number, number]>;
    } | null;
    timelineData?: TimelineData[];
    onTimelineChange?: (data: TimelineData, index: number) => void;
    showTimeline?: boolean;
};

export default function MapView({
    onRegionSelect,
    ndviTileUrl,
    userLocation,
    selectedRegion,
    timelineData = [],
    onTimelineChange,
    showTimeline = false,
}: MapViewProps) {
    const [currentNdviUrl, setCurrentNdviUrl] = useState<string | undefined>(
        ndviTileUrl
    );

    // Handle timeline changes
    const handleTimelineChange = (data: TimelineData, index: number) => {
        // Update the NDVI tile URL for the selected timestamp
        setCurrentNdviUrl(data.url);

        // Notify parent component
        if (onTimelineChange) {
            onTimelineChange(data, index);
        }
    };

    const mapRef = useRef<L.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
    const ndviLayerRef = useRef<L.TileLayer | null>(null);
    const currentPolygonRef = useRef<L.Polygon | null>(null);
    useEffect(() => {
        // Make sure Leaflet markers work properly in Next.js
        // @ts-expect-error - This is a known issue with Leaflet in Next.js
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: "/leaflet/marker-icon-2x.png",
            iconUrl: "/leaflet/marker-icon.png",
            shadowUrl: "/leaflet/marker-shadow.png",
        });

        if (!mapContainerRef.current) return; // Initialize map only if it hasn't been initialized
        if (!mapRef.current) {
            // Center on user location if available, otherwise use default location
            const initialCenter = userLocation
                ? [userLocation.lat, userLocation.lng]
                : [51.505, -0.09];
            const initialZoom = userLocation ? 10 : 3;

            mapRef.current = L.map(mapContainerRef.current).setView(
                initialCenter as [number, number],
                initialZoom
            );

            // Add OpenStreetMap tiles
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                maxZoom: 19,
                attribution:
                    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            }).addTo(mapRef.current);

            // Initialize the FeatureGroup to store drawn items
            drawnItemsRef.current = new L.FeatureGroup();
            mapRef.current.addLayer(drawnItemsRef.current);

            // Initialize the draw control
            const drawControl = new L.Control.Draw({
                draw: {
                    polyline: false,
                    rectangle: false,
                    circle: false,
                    circlemarker: false,
                    marker: false,
                    polygon: {
                        allowIntersection: false,
                        showArea: true,
                        drawError: {
                            color: "#e1e100",
                            message:
                                "<strong>Error:</strong> Polygon edges cannot cross!",
                        },
                        shapeOptions: {
                            color: "#ff0000", // Red color for better visibility over NDVI
                            weight: 4,
                            opacity: 1,
                            fillOpacity: 0.3,
                        },
                    },
                },
                edit: {
                    featureGroup: drawnItemsRef.current,
                    remove: true,
                },
            });
            mapRef.current.addControl(drawControl); // Event handler for when a polygon is created
            mapRef.current.on(L.Draw.Event.CREATED, (e: L.LeafletEvent) => {
                const event = e as unknown as { layer: L.Polygon };
                const layer = event.layer;

                // Add the layer to the feature group
                if (drawnItemsRef.current) {
                    // Clear any existing layers first (only one polygon at a time)
                    drawnItemsRef.current.clearLayers();

                    // Store reference to current polygon
                    currentPolygonRef.current = layer; // Add the new layer
                    drawnItemsRef.current.addLayer(layer);

                    // Ensure the drawn polygon is always on top
                    drawnItemsRef.current.bringToFront();

                    // Get the polygon coordinates
                    const latLngs = layer.getLatLngs()[0] as L.LatLng[];
                    const coordinates = latLngs.map(
                        (ll) => [ll.lat, ll.lng] as [number, number]
                    );

                    // Calculate center of polygon
                    const bounds = layer.getBounds();
                    const center = bounds.getCenter();

                    // Generate a name based on the location
                    const name = `Selected Region (${center.lat.toFixed(
                        4
                    )}, ${center.lng.toFixed(4)})`;

                    // Add the region data to parent component
                    onRegionSelect({
                        name,
                        center: { lat: center.lat, lng: center.lng },
                        coordinates,
                    });

                    // Add a popup with the area name
                    layer.bindPopup(name).openPopup();
                }
            }); // Event handler for when a polygon is edited
            mapRef.current.on(L.Draw.Event.EDITED, (e: L.LeafletEvent) => {
                const event = e as unknown as { layers: L.LayerGroup };
                const layers = event.layers;
                layers.eachLayer((layer) => {
                    // Cast layer to Polygon
                    const polygon = layer as unknown as L.Polygon;

                    // Update the current polygon reference
                    currentPolygonRef.current = polygon;

                    // Get the updated polygon coordinates
                    const latLngs = polygon.getLatLngs()[0] as L.LatLng[];
                    const coordinates = latLngs.map(
                        (ll) => [ll.lat, ll.lng] as [number, number]
                    );

                    // Calculate center of polygon
                    const bounds = polygon.getBounds();
                    const center = bounds.getCenter();
                    // Generate a name based on the location
                    const name = `Selected Region (${center.lat.toFixed(
                        4
                    )}, ${center.lng.toFixed(4)})`; // Pass the region data to parent component
                    onRegionSelect({
                        name,
                        center: { lat: center.lat, lng: center.lng },
                        coordinates,
                    });

                    // Update popup
                    polygon.bindPopup(name).openPopup();

                    // Ensure the drawn polygon stays on top
                    if (drawnItemsRef.current) {
                        drawnItemsRef.current.bringToFront();
                    }
                });
            }); // Event handler for when a polygon is deleted
            mapRef.current.on(L.Draw.Event.DELETED, () => {
                // Clear the current polygon reference
                currentPolygonRef.current = null;

                // Clear the selected region when deleted
                onRegionSelect({
                    name: "",
                    center: { lat: 0, lng: 0 },
                    coordinates: [],
                });
            });

            // Add an instruction element to the map
            const instructionDiv = L.DomUtil.create("div", "map-instructions");
            instructionDiv.innerHTML = `
                <div class="bg-white p-3 rounded shadow-md max-w-xs">
                    <strong>Draw a polygon</strong> to select a region for analysis.
                </div>
            `;
            const instructionControl = L.Control.extend({
                options: {
                    position: "topright",
                },
                onAdd: function () {
                    return instructionDiv;
                },
            });

            new instructionControl().addTo(mapRef.current);
        } // Cleanup function to remove map
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [onRegionSelect, userLocation]); // Add or update NDVI tile layer when ndviTileUrl changes
    useEffect(() => {
        if (!mapRef.current) return;

        // Remove previous NDVI layer if it exists
        if (ndviLayerRef.current) {
            mapRef.current.removeLayer(ndviLayerRef.current);
            ndviLayerRef.current = null;
        } // Add new NDVI layer if URL is provided
        if (currentNdviUrl) {
            ndviLayerRef.current = L.tileLayer(currentNdviUrl, {
                attribution: "Google Earth Engine | TensorFarm",
                opacity: 0.7,
                maxZoom: 19,
                zIndex: 1, // Lower z-index so drawn polygons appear on top
            }).addTo(mapRef.current);

            // Ensure drawn items layer is on top of NDVI layer
            if (
                drawnItemsRef.current &&
                mapRef.current.hasLayer(drawnItemsRef.current)
            ) {
                drawnItemsRef.current.bringToFront();
            }
        }
    }, [currentNdviUrl]);

    // Update currentNdviUrl when ndviTileUrl prop changes (for initial load)
    useEffect(() => {
        if (ndviTileUrl && !timelineData.length) {
            setCurrentNdviUrl(ndviTileUrl);
        }
    }, [ndviTileUrl, timelineData.length]); // Display selected region on the map (only when there's no current polygon from drawing)
    useEffect(() => {
        if (!mapRef.current || !drawnItemsRef.current) return;

        // Only restore the polygon if we don't already have one from drawing
        // This prevents conflicts with the drawing tools
        if (
            selectedRegion?.coordinates &&
            selectedRegion.coordinates.length > 0 &&
            !currentPolygonRef.current
        ) {
            // Convert to Leaflet LatLngs
            const latLngs = selectedRegion.coordinates.map(
                ([lat, lng]) => new L.LatLng(lat, lng)
            ); // Create a polygon and add it to the map
            const polygon = new L.Polygon(latLngs, {
                color: "#ff0000", // Red color for better visibility over NDVI
                weight: 4,
                opacity: 1,
                fillOpacity: 0.3,
            }); // Store reference to current polygon
            currentPolygonRef.current = polygon;

            // Add to drawn items layer
            drawnItemsRef.current.addLayer(polygon);

            // Ensure the drawn polygon is always on top
            drawnItemsRef.current.bringToFront();

            // Add a popup with the region name
            polygon.bindPopup(selectedRegion.name);

            // Fit map to polygon bounds
            mapRef.current.fitBounds(polygon.getBounds());
        }
    }, [selectedRegion]);
    return (
        <div className="relative h-full w-full">
            <motion.div
                ref={mapContainerRef}
                className="h-full w-full z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
            />

            {/* Timeline Bar */}
            {showTimeline && timelineData.length > 0 && (
                <TimelineBar
                    timelineData={timelineData}
                    onTimelineChange={handleTimelineChange}
                    position="bottom"
                />
            )}
        </div>
    );
}
