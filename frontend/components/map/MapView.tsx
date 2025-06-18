"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

// Import the draw plugin
import "leaflet-draw";

type MapViewProps = {
    onRegionSelect: (region: {
        name: string;
        center: { lat: number; lng: number };
        coordinates: Array<[number, number]>;
    }) => void;
    ndviTileUrl?: string;
};

export default function MapView({ onRegionSelect, ndviTileUrl }: MapViewProps) {
    const mapRef = useRef<L.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
    const ndviLayerRef = useRef<L.TileLayer | null>(null);
    useEffect(() => {
        // Make sure Leaflet markers work properly in Next.js
        // @ts-expect-error - This is a known issue with Leaflet in Next.js
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: "/leaflet/marker-icon-2x.png",
            iconUrl: "/leaflet/marker-icon.png",
            shadowUrl: "/leaflet/marker-shadow.png",
        });

        if (!mapContainerRef.current) return;

        // Initialize map only if it hasn't been initialized
        if (!mapRef.current) {
            // Center on a default location
            mapRef.current = L.map(mapContainerRef.current).setView(
                [51.505, -0.09],
                3
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
                            color: "#3388ff",
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
                    // Clear any existing layers first
                    drawnItemsRef.current.clearLayers();

                    // Add the new layer
                    drawnItemsRef.current.addLayer(layer);

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
            });

            // Event handler for when a polygon is edited
            mapRef.current.on(L.Draw.Event.EDITED, (e: L.LeafletEvent) => {
                const event = e as unknown as { layers: L.LayerGroup };
                const layers = event.layers;
                layers.eachLayer((layer) => {
                    // Cast layer to Polygon
                    const polygon = layer as unknown as L.Polygon;

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
                    )}, ${center.lng.toFixed(4)})`;

                    // Pass the region data to parent component
                    onRegionSelect({
                        name,
                        center: { lat: center.lat, lng: center.lng },
                        coordinates,
                    });

                    // Update popup
                    polygon.bindPopup(name).openPopup();
                });
            });

            // Event handler for when a polygon is deleted
            mapRef.current.on(L.Draw.Event.DELETED, () => {
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
    }, [onRegionSelect]);

    // Add or update NDVI tile layer when ndviTileUrl changes
    useEffect(() => {
        if (!mapRef.current) return;

        // Remove previous NDVI layer if it exists
        if (ndviLayerRef.current) {
            mapRef.current.removeLayer(ndviLayerRef.current);
            ndviLayerRef.current = null;
        }

        // Add new NDVI layer if URL is provided
        if (ndviTileUrl) {
            ndviLayerRef.current = L.tileLayer(ndviTileUrl, {
                attribution: "Google Earth Engine | TensorFarm",
                opacity: 0.7,
                maxZoom: 19,
            }).addTo(mapRef.current);
        }
    }, [ndviTileUrl]);

    return (
        <div className="relative h-full w-full">
            <div ref={mapContainerRef} className="h-full w-full z-10" />
        </div>
    );
}
