"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import { motion } from "framer-motion";
import TimelineBar from "./TimelineBar";
import { TimelineData } from "../../lib/timeline-store";
import { Button } from "../ui/button/index";

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
}: MapViewProps) {    const [currentNdviUrl, setCurrentNdviUrl] = useState<string | undefined>(
        ndviTileUrl
    );
      // Store pending polygon data that needs user confirmation
    const [pendingPolygon, setPendingPolygon] = useState<{
        name: string;
        center: { lat: number; lng: number };
        coordinates: Array<[number, number]>;
    } | null>(null);// Handle confirming the polygon selection
    const handleConfirmSelection = () => {
        if (pendingPolygon) {
            onRegionSelect({
                name: pendingPolygon.name,
                center: pendingPolygon.center,
                coordinates: pendingPolygon.coordinates,
            });
        }
    };    // Handle canceling the polygon selection
    const handleCancelSelection = () => {
        if (pendingPolygonLayerRef.current && drawnItemsRef.current) {
            drawnItemsRef.current.removeLayer(pendingPolygonLayerRef.current);
            pendingPolygonLayerRef.current = null;
            setPendingPolygon(null);
            isUserDrawnRef.current = false;
        }
    };    // Redraw the pending polygon whenever needed
    const redrawPendingPolygon = useCallback(() => {
        if (pendingPolygon && drawnItemsRef.current && mapRef.current) {
            // Remove existing layer if it exists
            if (pendingPolygonLayerRef.current && mapRef.current.hasLayer(pendingPolygonLayerRef.current)) {
                drawnItemsRef.current.removeLayer(pendingPolygonLayerRef.current);
            }
            
            // Recreate the polygon
            const latLngs = pendingPolygon.coordinates.map(
                ([lat, lng]) => new L.LatLng(lat, lng)
            );
            const newPolygon = new L.Polygon(latLngs, {
                color: "#ff0000",
                weight: 4,
                opacity: 1,
                fillOpacity: 0.3,
            });
            
            // Add to map
            drawnItemsRef.current.addLayer(newPolygon);
            drawnItemsRef.current.bringToFront();
            newPolygon.bindPopup(`${pendingPolygon.name}<br/><small>Click "Confirm Selection" to fetch data</small>`);
            
            // Store the layer reference
            pendingPolygonLayerRef.current = newPolygon;
        }
    }, [pendingPolygon]);

    // Handle timeline changes
    const handleTimelineChange = (data: TimelineData, index: number) => {
        // Update the NDVI tile URL for the selected timestamp
        setCurrentNdviUrl(data.url);

        // Notify parent component
        if (onTimelineChange) {
            onTimelineChange(data, index);
        }
    };    const mapRef = useRef<L.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
    const ndviLayerRef = useRef<L.TileLayer | null>(null);
    const isUserDrawnRef = useRef<boolean>(false);
    const pendingPolygonLayerRef = useRef<L.Polygon | null>(null);
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
                            color: "#ff0000",
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
            mapRef.current.addControl(drawControl);            // Store polygon data for user confirmation instead of immediately triggering onRegionSelect
            mapRef.current.on(L.Draw.Event.CREATED, (e: L.LeafletEvent) => {
                const event = e as unknown as { layer: L.Polygon };
                const layer = event.layer;

                // Add the layer to the drawn items group
                drawnItemsRef.current!.addLayer(layer);
                isUserDrawnRef.current = true;
                
                // Store the layer reference
                pendingPolygonLayerRef.current = layer;

                // Extract coordinates and store for confirmation
                const latLngs = layer.getLatLngs()[0] as L.LatLng[];
                const coordinates = latLngs.map(
                    (ll) => [ll.lat, ll.lng] as [number, number]
                );
                const bounds = layer.getBounds();
                const center = bounds.getCenter();
                const name = `Selected Region (${center.lat.toFixed(
                    4
                )}, ${center.lng.toFixed(4)})`;

                // Add popup with confirmation message
                layer.bindPopup(`${name}<br/><small>Click "Confirm Selection" to fetch data</small>`).openPopup();

                // Store the pending polygon data
                setPendingPolygon({
                    name,
                    center: { lat: center.lat, lng: center.lng },
                    coordinates
                });
            });            mapRef.current.on(L.Draw.Event.EDITED, (e: L.LeafletEvent) => {
                const event = e as unknown as { layers: L.LayerGroup };
                event.layers.eachLayer((layer) => {
                    const polygon = layer as unknown as L.Polygon;
                    isUserDrawnRef.current = true;
                    
                    // Store the layer reference
                    pendingPolygonLayerRef.current = polygon;

                    const latLngs = polygon.getLatLngs()[0] as L.LatLng[];
                    const coordinates = latLngs.map(
                        (ll) => [ll.lat, ll.lng] as [number, number]
                    );
                    const bounds = polygon.getBounds();
                    const center = bounds.getCenter();
                    const name = `Selected Region (${center.lat.toFixed(
                        4
                    )}, ${center.lng.toFixed(4)})`;

                    polygon.bindPopup(`${name}<br/><small>Click "Confirm Selection" to fetch data</small>`).openPopup();

                    // Update pending polygon data
                    setPendingPolygon({
                        name,
                        center: { lat: center.lat, lng: center.lng },
                        coordinates
                    });
                });
            });            mapRef.current.on(L.Draw.Event.DELETED, () => {
                isUserDrawnRef.current = false;
                pendingPolygonLayerRef.current = null;
                setPendingPolygon(null);
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
    }, [onRegionSelect, userLocation]);    // Add or update NDVI tile layer when ndviTileUrl changes
    useEffect(() => {
        if (!mapRef.current) return;

        // Remove previous NDVI layer if it exists
        if (ndviLayerRef.current) {
            mapRef.current.removeLayer(ndviLayerRef.current);
            ndviLayerRef.current = null;
        }
        
        // Add new NDVI layer if URL is provided
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
            
            // Redraw pending polygon after NDVI layer is added
            redrawPendingPolygon();
        }
    }, [currentNdviUrl, redrawPendingPolygon]);

    // Update currentNdviUrl when ndviTileUrl prop changes (for initial load)
    useEffect(() => {
        if (ndviTileUrl && !timelineData.length) {
            setCurrentNdviUrl(ndviTileUrl);
        }    }, [ndviTileUrl, timelineData.length]);// Display selected region on the map or handle region clearing
    useEffect(() => {
        if (!mapRef.current || !drawnItemsRef.current) return;

        // Don't interfere with user-drawn polygons or pending polygons
        if (isUserDrawnRef.current || pendingPolygon) {
            return;
        }

        // Clear existing polygons
        drawnItemsRef.current.clearLayers();

        // Add polygon from external source (not user-drawn)
        if (
            selectedRegion &&
            selectedRegion.coordinates &&
            selectedRegion.coordinates.length > 0
        ) {
            const latLngs = selectedRegion.coordinates.map(
                ([lat, lng]) => new L.LatLng(lat, lng)
            );
            const polygon = new L.Polygon(latLngs, {
                color: "#ff0000",
                weight: 4,
                opacity: 1,
                fillOpacity: 0.3,
                fillColor: "#ff0000",
            });
            drawnItemsRef.current.addLayer(polygon);
            drawnItemsRef.current.bringToFront();
            polygon.bindPopup(selectedRegion.name);
        } else if (selectedRegion?.name === "") {
            // Clear user-drawn flag when region is explicitly cleared
            isUserDrawnRef.current = false;
            setPendingPolygon(null);
        }
    }, [selectedRegion, pendingPolygon]);return (
        <div className="relative h-full w-full">
            <motion.div
                ref={mapContainerRef}
                className="h-full w-full z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
            />

            {/* Polygon Confirmation Buttons */}
            {pendingPolygon && (
                <div className="absolute top-4 left-4 z-50 bg-white p-3 rounded-md shadow-lg">
                    <p className="text-sm mb-3">
                        <strong>Region Selected</strong>
                        <br />
                        {pendingPolygon.name}
                    </p>
                    <div className="flex gap-2">
                        <Button
                            onClick={handleConfirmSelection}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                        >
                            Confirm Selection
                        </Button>
                        <Button
                            onClick={handleCancelSelection}
                            variant="outline"
                            size="sm"
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            )}

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
