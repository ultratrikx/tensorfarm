// API base URL
const API_BASE_URL = "http://127.0.0.1:8000"; // Update this if your FastAPI backend runs on a different port

// Types
export interface GeoJsonPolygon {
    type: "Polygon";
    coordinates: number[][][]; // [[[lng, lat], [lng, lat], ...]]
}

export interface ApiOptions {
    satellite_source?: "sentinel-2" | "landsat-8" | "landsat-9";
    start_date?: string;
    end_date?: string;
    time_series?: boolean;
    include_weather?: boolean;
    include_topography?: boolean;
    include_landcover?: boolean;
}

export interface NdviDataResponse {
    ndvi_tiles: {
        url: string;
        attribution: string;
        min: number;
        max: number;
        satellite: string;
        start_date: string;
        end_date: string;
    };
    time_series?: {
        data: {
            date: string;
            ndvi: number;
            url: string;
        }[];
        count: number;
        timestamps: string[];
        summary: {
            min_ndvi: number | null;
            max_ndvi: number | null;
            mean_ndvi: number | null;
        };
    };
    weather?: {
        data: {
            date: string;
            temperature_celsius?: number;
            precipitation_mm?: number;
        }[];
        count: number;
    };
    topography?: {
        elevation: {
            min_meters: number;
            max_meters: number;
            mean_meters: number;
            tile_url: string;
        };
        slope: {
            min_degrees: number;
            max_degrees: number;
            mean_degrees: number;
            tile_url: string;
        };
        aspect: {
            min_degrees: number;
            max_degrees: number;
            mean_degrees: number;
        };
    };
    landcover?: {
        land_cover: {
            classes: Record<
                string,
                { percentage: number; area_hectares: number }
            >;
            dominant_class: string;
            tile_url: string;
        };
        vegetation: {
            tree_cover_percent: number;
            non_tree_vegetation_percent: number;
            non_vegetated_percent: number;
        };
    };
}

/**
 * Check if Earth Engine is authenticated
 * @returns {Promise<{authenticated: boolean, message: string}>}
 */
export async function checkAuthStatus(): Promise<{
    authenticated: boolean;
    message: string;
}> {
    try {
        const response = await fetch(`${API_BASE_URL}/auth-status/`);
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error checking auth status:", error);
        return {
            authenticated: false,
            message: "Could not connect to API server",
        };
    }
}

/**
 * Get NDVI and other data for a polygon
 * @param {GeoJsonPolygon} polygon - GeoJSON polygon object
 * @param {ApiOptions} options - Options for the API request
 * @returns {Promise<NdviDataResponse>} - API response with NDVI tiles and data
 */
export async function getNdviData(
    polygon: GeoJsonPolygon,
    options: ApiOptions = {}
): Promise<NdviDataResponse> {
    try {
        const defaultOptions: ApiOptions = {
            satellite_source: "sentinel-2",
            start_date: "2024-11-01",
            end_date: "2025-05-01",
            time_series: true,
            include_weather: true,
            include_topography: false,
            include_landcover: true,
        };

        const requestOptions = { ...defaultOptions, ...options };

        const response = await fetch(`${API_BASE_URL}/ndvi-tiles/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                polygon,
                ...requestOptions,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                errorData.detail || `API error: ${response.status}`
            );
        }

        return await response.json();
    } catch (error) {
        console.error("Error fetching NDVI data:", error);
        throw error;
    }
}

/**
 * Convert a Leaflet polygon to GeoJSON format
 * @param {Array<[number, number]>} coordinates - Array of [lat, lng] coordinates
 * @returns {GeoJsonPolygon} - GeoJSON polygon
 */
export function createGeoJsonPolygon(
    coordinates: [number, number][]
): GeoJsonPolygon {
    // Leaflet uses [lat, lng] but GeoJSON uses [lng, lat]
    const geoJsonCoordinates = coordinates.map(
        ([lat, lng]: [number, number]) => [lng, lat]
    );

    // Close the polygon if it's not already closed
    if (
        geoJsonCoordinates[0][0] !==
            geoJsonCoordinates[geoJsonCoordinates.length - 1][0] ||
        geoJsonCoordinates[0][1] !==
            geoJsonCoordinates[geoJsonCoordinates.length - 1][1]
    ) {
        geoJsonCoordinates.push(geoJsonCoordinates[0]);
    }

    return {
        type: "Polygon",
        coordinates: [geoJsonCoordinates],
    };
}

/**
 * Get center coordinates for a polygon
 * @param {Array<[number, number]>} coordinates - Array of [lat, lng] coordinates
 * @returns {{lat: number, lng: number}} - Center coordinates
 */
export function getPolygonCenter(coordinates: [number, number][]): {
    lat: number;
    lng: number;
} {
    if (!coordinates || coordinates.length === 0) {
        return { lat: 0, lng: 0 };
    }

    // Calculate the centroid of the polygon
    let sumLat = 0;
    let sumLng = 0;

    coordinates.forEach(([lat, lng]: [number, number]) => {
        sumLat += lat;
        sumLng += lng;
    });

    return {
        lat: sumLat / coordinates.length,
        lng: sumLng / coordinates.length,
    };
}
