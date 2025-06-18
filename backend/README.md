# TensorFarm NDVI API

This API provides NDVI (Normalized Difference Vegetation Index) tiles from Google Earth Engine for a specified polygon area. The tiles are compatible with Leaflet for frontend visualization.

## Setup

### Prerequisites

1. Python 3.8+
2. Google Earth Engine account with authentication set up

### Environment Setup

1. Create a virtual environment (if not already created):

```
cd backend
python -m venv venv
```

2. Activate the virtual environment:

```
# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

3. Install dependencies:

```
pip install -r requirements.txt
```

4. Set up Google Earth Engine Authentication:

```
# Install the Earth Engine CLI if you haven't already
pip install earthengine-api

# Authenticate with Google Earth Engine
earthengine authenticate
```

#### Complete Google Earth Engine Setup

If you encounter authentication errors, follow these additional steps:

1. Create a Google Cloud Project:

    - Go to [Google Cloud Console](https://console.cloud.google.com/)
    - Create a new project or select an existing one
    - Note your project ID

2. Enable the Earth Engine API:

    - Go to [Google Cloud Console APIs](https://console.cloud.google.com/apis/dashboard)
    - Search for "Earth Engine" and enable the API for your project

3. Register for Earth Engine:

    - Visit [Earth Engine Sign Up](https://signup.earthengine.google.com/)
    - Register with the same Google account you used for authentication

4. Set Permissions:

    - Make sure your account has the necessary IAM permissions
    - At minimum, you need the "Earth Engine User" role

5. Update the API Code (if needed):
    - Open `main.py`
    - Find the `ee.Initialize(project='tensorfarm')` line
    - Replace 'tensorfarm' with your actual Google Cloud project ID

For detailed instructions, visit the [Earth Engine Python API Setup Guide](https://developers.google.com/earth-engine/guides/python_install).

### Running the API

Start the FastAPI server:

```
uvicorn main:app --reload
```

The API will be available at http://localhost:8000

## API Usage

### Get NDVI Tiles

**Endpoint:** `POST /ndvi-tiles/`

**Request Body:**

```json
{
    "polygon": {
        "type": "Polygon",
        "coordinates": [
            [
                [-80.0, 43.6],
                [-80.0, 43.61],
                [-79.99, 43.61],
                [-79.99, 43.6],
                [-80.0, 43.6]
            ]
        ]
    },
    "satellite_source": "sentinel-2",
    "start_date": "2024-11-01",
    "end_date": "2025-05-01",
    "time_series": false
}
```

**Parameters:**

| Parameter          | Type    | Description                                                                   | Default        |
| ------------------ | ------- | ----------------------------------------------------------------------------- | -------------- |
| `polygon`          | Object  | GeoJSON polygon object defining the area of interest                          | Required       |
| `satellite_source` | String  | Satellite data source to use: `"sentinel-2"`, `"landsat-8"`, or `"landsat-9"` | `"sentinel-2"` |
| `start_date`       | String  | Start date for the time period (YYYY-MM-DD)                                   | `"2024-11-01"` |
| `end_date`         | String  | End date for the time period (YYYY-MM-DD)                                     | `"2025-05-01"` |
| `time_series`      | Boolean | Whether to include time series data in the response                           | `false`        |

**Basic Response:**

```json
{
    "ndvi_tiles": {
        "url": "https://earthengine.googleapis.com/map/...",
        "attribution": "Google Earth Engine | Sentinel-2",
        "min": 0,
        "max": 1,
        "satellite": "sentinel-2",
        "start_date": "2024-11-01",
        "end_date": "2025-05-01"
    }
}
```

**Time Series Response:**

When `time_series` is set to `true`, additional data is returned:

```json
{
    "ndvi_tiles": {
        /* same as above */
    },
    "time_series": {
        "data": [
            {
                "date": "2024-11-15",
                "ndvi": 0.65,
                "url": "https://earthengine.googleapis.com/map/..."
            },
            {
                "date": "2024-12-08",
                "ndvi": 0.58,
                "url": "https://earthengine.googleapis.com/map/..."
            }
            /* ... more dates ... */
        ],
        "count": 8,
        "timestamps": ["2024-11-15", "2024-12-08", "2025-01-12" /* ... */],
        "summary": {
            "min_ndvi": 0.45,
            "max_ndvi": 0.65,
            "mean_ndvi": 0.56
        },
        "rgb_visualization": {
            "url": "https://earthengine.googleapis.com/map/...",
            "dates": ["2024-11-15", "2025-01-12", "2025-04-21"]
        }
    }
}
```

## Using Time Series Data

The API provides optimized time series data that integrates both NDVI values (for graphing) and tile URLs (for map display) in a single structure. This makes it easier to build interactive visualizations that synchronize maps and charts.

### Key Benefits of the Integrated Time Series Format:

1. **Synchronized Data Structure**: Each object in the `data` array contains both the NDVI value and corresponding tile URL for a specific date.

2. **Statistical Summary**: The response includes min, max, and mean NDVI values for the entire time period.

3. **Timestamps Array**: A separate array of all dates is provided for quick reference.

4. **RGB Visualization**: A composite image showing changes over time (first date in red, middle in green, last in blue).

### Example Usage with Time Slider:

The demo frontend shows how to use this data structure to create an interactive time slider that:

1. Displays the NDVI map for the selected date
2. Shows the corresponding NDVI value
3. Allows animation playback through the time series
4. Displays a chart of NDVI values over time

```javascript
// Example of handling time slider changes
timeSlider.addEventListener("input", function () {
    const index = parseInt(this.value);
    const selectedItem = data.time_series.data[index];

    // Update UI with current NDVI value
    valueDisplay.textContent = selectedItem.ndvi.toFixed(3);

    // Update map with current tile
    updateMapLayer(selectedItem.url);
});
```

## Known Issues and Limitations

### Fixed Date for Sentinel-2 Data

The API currently uses fixed dates for querying Sentinel-2 imagery:

-   Current date: May 1, 2025
-   6 months prior: November 1, 2024

This is due to issues with Earth Engine's handling of dynamic dates. If you need more recent imagery, you'll need to update these dates in `main.py`. Look for the section with:

```python
current_date = ee.Date('2025-05-01')  # Current date set to May 2025
six_months_ago = ee.Date('2024-11-01')  # 6 months before
```

## Frontend Integration with Leaflet

Example of how to use the response in a Leaflet map:

```javascript
// Assuming you have a Leaflet map instance 'map'
fetch("http://localhost:8000/ndvi-tiles/", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
    },
    body: JSON.stringify({
        polygon: {
            type: "Polygon",
            coordinates: [
                [
                    [-80.0, 43.6],
                    [-80.0, 43.61],
                    [-79.99, 43.61],
                    [-79.99, 43.6],
                    [-80.0, 43.6],
                ],
            ],
        },
    }),
})
    .then((response) => response.json())
    .then((data) => {
        const ndviLayer = L.tileLayer(data.ndvi_tiles.url, {
            attribution: data.ndvi_tiles.attribution,
            maxZoom: 18,
        });
        ndviLayer.addTo(map);

        // Optional: Add a legend for NDVI values
        const legend = L.control({ position: "bottomright" });
        legend.onAdd = function () {
            const div = L.DomUtil.create("div", "info legend");
            div.innerHTML =
                "<strong>NDVI</strong><br>" +
                '<i style="background: #ffffe5"></i> 0.0<br>' +
                '<i style="background: #86d780"></i> 0.5<br>' +
                '<i style="background: #006400"></i> 1.0<br>';
            return div;
        };
        legend.addTo(map);
    });
```
