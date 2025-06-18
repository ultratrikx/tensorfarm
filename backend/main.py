from fastapi import FastAPI, HTTPException  
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List
import ee
import json
import logging
import os
import time
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Earth Engine
ee_initialized = False

def initialize_earth_engine():
    global ee_initialized
    try:
        # Try to initialize with private key if available
        # Look for credentials in standard locations
        ee.Initialize(project='tensorfarm')  # Specify your GEE project ID here or pass None
        logger.info("Earth Engine initialized successfully")
        ee_initialized = True
        return True
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Failed to initialize Earth Engine: {error_msg}")
        if "no project found" in error_msg or "PERMISSION_DENIED" in error_msg:
            logger.warning("Authentication issue detected with Google Earth Engine")
            logger.info("Please follow these steps:")
            logger.info("1. Run 'earthengine authenticate' in your terminal")
            logger.info("2. Create a Google Cloud project if you don't have one")
            logger.info("3. Enable the Earth Engine API in your Google Cloud project")
            logger.info("4. Set up proper permissions for your account")
            logger.info("For detailed instructions, visit: https://developers.google.com/earth-engine/guides/python_install")
        ee_initialized = False
        return False

# Try to initialize at startup
initialize_earth_engine()

app = FastAPI(title="TensorFarm NDVI API", 
              description="API to get NDVI tiles from Earth Engine for a given polygon")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PolygonData(BaseModel):
    polygon: Dict[str, Any]
    satellite_source: str = "sentinel-2"  # Options: "sentinel-2", "landsat-8", "landsat-9"
    start_date: str = "2024-11-01"  # Default start date for time series
    end_date: str = "2025-05-01"  # Default end date for time series
    time_series: bool = False  # Whether to return time series data
    include_weather: bool = False  # Whether to include weather data (temperature, precipitation)
    include_topography: bool = False  # Whether to include topographical data (elevation, slope)
    include_landcover: bool = False  # Whether to include land cover data (land cover classes, vegetation stats)

@app.get("/")
def read_root():
    return {"message": "Welcome to TensorFarm NDVI API"}

@app.get("/auth-status/")
def check_auth_status():
    global ee_initialized
    
    # Try to initialize if not already initialized
    if not ee_initialized:
        initialize_earth_engine()
    
    return {
        "authenticated": ee_initialized,
        "message": "Earth Engine authenticated successfully" if ee_initialized else "Earth Engine authentication required",
        "instructions": None if ee_initialized else [
            "Run 'earthengine authenticate' in your terminal",
            "Create a Google Cloud project and enable Earth Engine API",
            "Set up proper permissions for your account",
            "Restart the API server after authentication"
        ]
    }

@app.post("/ndvi-tiles/")
def get_ndvi_tiles(data: PolygonData):
    global ee_initialized
    
    # Check if Earth Engine is initialized
    if not ee_initialized:
        # Try to initialize again
        if not initialize_earth_engine():
            raise HTTPException(
                status_code=503, 
                detail="Earth Engine not authenticated. Run 'earthengine authenticate' in your terminal and restart the server."
            )
    
    try:
        # Extract the polygon from the request
        polygon_geojson = data.polygon
        
        if polygon_geojson["type"] != "Polygon":
            raise HTTPException(status_code=400, detail="Only Polygon geometry types are supported")
        
        # Convert the GeoJSON polygon to an Earth Engine geometry
        coordinates = polygon_geojson["coordinates"][0]  # Get the outer ring coordinates
        ee_polygon = ee.Geometry.Polygon(coordinates)
        
        # Get dates from request parameters or use defaults
        start_date = ee.Date(data.start_date)
        end_date = ee.Date(data.end_date)        # Log the parameters being used
        logger.info(f"Processing request with: satellite={data.satellite_source}, start_date={data.start_date}, end_date={data.end_date}, time_series={data.time_series}")
        logger.info(f"Additional data requested: weather={data.include_weather}, topography={data.include_topography}, landcover={data.include_landcover}")
        
        # Select satellite collection and bands based on source
        if data.satellite_source.lower() == "landsat-8":
            collection_name = "LANDSAT/LC08/C02/T1_L2"  # Landsat 8 Collection 2 Tier 1 Level 2
            nir_band = 'SR_B5'  # Near-infrared band
            red_band = 'SR_B4'  # Red band
            cloud_cover = 'CLOUD_COVER'
            scale_factor = 0.0000275  # Landsat 8 Collection 2 scale factor
            add_offset = -0.2  # Landsat 8 Collection 2 offset
        elif data.satellite_source.lower() == "landsat-9":
            collection_name = "LANDSAT/LC09/C02/T1_L2"  # Landsat 9 Collection 2 Tier 1 Level 2
            nir_band = 'SR_B5'  # Near-infrared band
            red_band = 'SR_B4'  # Red band
            cloud_cover = 'CLOUD_COVER'
            scale_factor = 0.0000275  # Landsat 9 Collection 2 scale factor
            add_offset = -0.2  # Landsat 9 Collection 2 offset
        else:
            # Default to Sentinel-2
            collection_name = "COPERNICUS/S2_SR"  # Sentinel-2 Surface Reflectance
            nir_band = 'B8'  # Near-infrared band
            red_band = 'B4'  # Red band
            cloud_cover = 'CLOUDY_PIXEL_PERCENTAGE'
            scale_factor = 0.0001  # Sentinel-2 scale factor
            add_offset = 0  # No offset for Sentinel-2

        # Load the selected satellite data
        image_collection = ee.ImageCollection(collection_name) \
            .filterDate(start_date, end_date) \
            .filterBounds(ee_polygon) \
            .filter(ee.Filter.lt(cloud_cover, 20))
        
        # Function to calculate NDVI for the selected satellite
        def add_ndvi(image):
            # Apply scale factor if needed for Landsat
            if data.satellite_source.lower() in ["landsat-8", "landsat-9"]:
                red = image.select(red_band).multiply(scale_factor).add(add_offset)
                nir = image.select(nir_band).multiply(scale_factor).add(add_offset)
                ndvi = nir.subtract(red).divide(nir.add(red)).rename('NDVI')
            else:
                ndvi = image.normalizedDifference([nir_band, red_band]).rename('NDVI')
            
            # Add date as a property for time series analysis
            return image.addBands(ndvi).set('system:time_start', image.get('system:time_start'))
        
        # Map the NDVI function over the image collection
        ndvi_collection = image_collection.map(add_ndvi)
        
        # Get the median NDVI value
        median_ndvi = ndvi_collection.select('NDVI').median()
        
        # Define visualization parameters
        vis_params = {
            'min': 0, 
            'max': 1, 
            'palette': [
                'FFFFFF', 'CE7E45', 'DF923D', 'F1B555', 'FCD163', '99B718',
                '74A901', '66A000', '529400', '3E8601', '207401', '056201',
                '004C00', '023B01', '012E01', '011D01', '011301'
            ]
        }
          # Create a tile URL template for Leaflet
        map_id = median_ndvi.getMapId(vis_params)
        tile_url_template = map_id['tile_fetcher'].url_format
        
        response = {
            "ndvi_tiles": {
                "url": tile_url_template,
                "attribution": f"Google Earth Engine | {data.satellite_source}",
                "min": 0,
                "max": 1,
                "satellite": data.satellite_source,
                "start_date": data.start_date,
                "end_date": data.end_date
            }
        }
        
        # Add time series data if requested
        if data.time_series:
            try:
                # Get the image collection with dates and NDVI values
                time_series_data = []
                
                # Create a list of available dates with NDVI values
                images_list = ndvi_collection.toList(ndvi_collection.size())
                size = images_list.size().getInfo()
                
                for i in range(size):
                    image = ee.Image(images_list.get(i))
                    date = ee.Date(image.get('system:time_start')).format('YYYY-MM-dd').getInfo()
                    
                    # Calculate mean NDVI for this date
                    mean_ndvi = image.select('NDVI').reduceRegion(
                        reducer=ee.Reducer.mean(),
                        geometry=ee_polygon,
                        scale=30,  # 30 meters for Landsat, 10 meters for Sentinel-2
                        maxPixels=1e9
                    ).get('NDVI').getInfo()
                    
                    if mean_ndvi is not None:
                        time_series_data.append({
                            "date": date,
                            "ndvi": mean_ndvi
                        })
                
                # Sort by date
                time_series_data.sort(key=lambda x: x['date'])                # Prepare the time series response structure with synchronized data
                response["time_series"] = {
                    "data": [],  # Will contain integrated data for each date (NDVI value and tile URL)
                    "count": len(time_series_data),
                    "timestamps": sorted(list(set([item["date"] for item in time_series_data]))),  # Sorted unique dates
                    "summary": {
                        "min_ndvi": min([item["ndvi"] for item in time_series_data]) if time_series_data else None,
                        "max_ndvi": max([item["ndvi"] for item in time_series_data]) if time_series_data else None,
                        "mean_ndvi": sum([item["ndvi"] for item in time_series_data]) / len(time_series_data) if time_series_data else None
                    }
                }
                
                # Generate tile URLs for each date in the time series and integrate with NDVI data
                for i in range(size):
                    try:
                        image = ee.Image(images_list.get(i))
                        date = ee.Date(image.get('system:time_start')).format('YYYY-MM-dd').getInfo()
                        
                        # Get NDVI band and create a tile URL for this specific date
                        ndvi_image = image.select('NDVI')
                        date_map_id = ndvi_image.getMapId(vis_params)
                        
                        # Find the corresponding NDVI value for this date
                        ndvi_value = next((item["ndvi"] for item in time_series_data if item["date"] == date), None)
                        
                        if ndvi_value is not None:
                            # Add integrated data (both NDVI value and tile URL) for this date
                            response["time_series"]["data"].append({
                                "date": date,
                                "ndvi": ndvi_value,
                                "url": date_map_id['tile_fetcher'].url_format
                            })
                    except Exception as e:
                        logger.warning(f"Could not generate tiles for date {i}: {e}")
                
                # Add additional data if requested
                # Weather data
                if data.include_weather:
                    logger.info("Fetching weather data...")
                    weather_data = get_weather_data(ee_polygon, start_date, end_date)
                    response["weather"] = weather_data
                
                # Topographical data
                if data.include_topography:
                    logger.info("Fetching topographical data...")
                    topo_data = get_topography_data(ee_polygon)
                    response["topography"] = topo_data
                  # Climate data
                if data.include_landcover:
                    logger.info("Fetching land cover data...")
                    # Use the most recent complete year for land cover data
                    current_year = datetime.now().year - 1  # Previous year to ensure complete data
                    landcover_data = get_landcover_data(ee_polygon, year=current_year)
                    response["landcover"] = landcover_data
            except Exception as e:
                logger.error(f"Error generating time series data: {e}")
                response["time_series"] = {"error": str(e)}
        
        return response
    
    except Exception as e:
        logger.error(f"Error processing request: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing NDVI data: {str(e)}")

def get_weather_data(region, start_date, end_date):
    """
    Fetch weather data (temperature and precipitation) for a region over a time period.
    
    Args:
        region (ee.Geometry): The region of interest
        start_date (ee.Date): Start date for data collection
        end_date (ee.Date): End date for data collection
        
    Returns:
        dict: Dictionary containing weather time series data
    """
    try:
        # ERA5 reanalysis dataset for temperature (2m air temperature)
        era5_temperature = ee.ImageCollection("ECMWF/ERA5/DAILY") \
            .filterDate(start_date, end_date) \
            .select('mean_2m_air_temperature')  # Kelvin
        
        # CHIRPS dataset for precipitation
        chirps_precipitation = ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY") \
            .filterDate(start_date, end_date) \
            .select('precipitation')  # mm/day
        
        # Get the dates in the collection
        temperature_dates = era5_temperature.aggregate_array('system:time_start')
        precipitation_dates = chirps_precipitation.aggregate_array('system:time_start')
        
        # Function to extract temperature for a date
        def get_temperature_for_date(date):
            date_ee = ee.Date(date)
            image = era5_temperature.filterDate(date_ee, date_ee.advance(1, 'day')).first()
            if image is None:
                return None
                
            # Convert Kelvin to Celsius
            temperature_image = image.subtract(273.15)
            
            # Get mean temperature for the region
            mean_temp = temperature_image.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=region,
                scale=27830,  # ERA5 resolution
                maxPixels=1e9
            ).get('mean_2m_air_temperature')
            
            # Format date
            formatted_date = date_ee.format('YYYY-MM-dd').getInfo()
            
            return {
                "date": formatted_date,
                "temperature_celsius": mean_temp.getInfo()
            }
        
        # Function to extract precipitation for a date
        def get_precipitation_for_date(date):
            date_ee = ee.Date(date)
            image = chirps_precipitation.filterDate(date_ee, date_ee.advance(1, 'day')).first()
            if image is None:
                return None
                
            # Get mean precipitation for the region (mm/day)
            mean_precip = image.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=region,
                scale=5566,  # CHIRPS resolution ~5km
                maxPixels=1e9
            ).get('precipitation')
            
            # Format date
            formatted_date = date_ee.format('YYYY-MM-dd').getInfo()
            
            return {
                "date": formatted_date,
                "precipitation_mm": mean_precip.getInfo()
            }
        
        # Get temperature for each date (sample every 5 days to reduce computation)
        temp_dates_list = temperature_dates.getInfo()
        temp_dates_sampled = [temp_dates_list[i] for i in range(0, len(temp_dates_list), 5)]
        temperature_data = [get_temperature_for_date(date) for date in temp_dates_sampled]
        temperature_data = [item for item in temperature_data if item is not None]
        
        # Get precipitation for each date (sample every 5 days to reduce computation)
        precip_dates_list = precipitation_dates.getInfo()
        precip_dates_sampled = [precip_dates_list[i] for i in range(0, len(precip_dates_list), 5)]
        precipitation_data = [get_precipitation_for_date(date) for date in precip_dates_sampled]
        precipitation_data = [item for item in precipitation_data if item is not None]
        
        # Create combined data structure with weather data by date
        weather_data = {}
        
        # Add temperature data
        for item in temperature_data:
            if item["date"] not in weather_data:
                weather_data[item["date"]] = {}
            weather_data[item["date"]]["temperature_celsius"] = item["temperature_celsius"]
        
        # Add precipitation data
        for item in precipitation_data:
            if item["date"] not in weather_data:
                weather_data[item["date"]] = {}
            weather_data[item["date"]]["precipitation_mm"] = item["precipitation_mm"]
        
        # Convert to array format
        weather_series = []
        for date, data in weather_data.items():
            entry = {"date": date}
            entry.update(data)
            weather_series.append(entry)
        
        # Sort by date
        weather_series.sort(key=lambda x: x["date"])
        
        return {
            "data": weather_series,
            "count": len(weather_series)
        }
    
    except Exception as e:
        logger.error(f"Error fetching weather data: {e}")
        return {"error": str(e)}

def get_topography_data(region):
    """
    Fetch topographical data (elevation, slope, aspect) for a region.
    
    Args:
        region (ee.Geometry): The region of interest
        
    Returns:
        dict: Dictionary containing topographical data
    """
    try:
        # SRTM Digital Elevation Model
        elevation = ee.Image("USGS/SRTMGL1_003")
        
        # Calculate slope and aspect
        terrain = ee.Terrain.products(elevation)
        
        # Get statistics for the region
        elevation_stats = elevation.reduceRegion(
            reducer=ee.Reducer.minMaxMean(),
            geometry=region,
            scale=30,  # SRTM resolution
            maxPixels=1e9
        ).getInfo()
        
        slope_stats = terrain.select('slope').reduceRegion(
            reducer=ee.Reducer.minMaxMean(),
            geometry=region,
            scale=30,
            maxPixels=1e9
        ).getInfo()
        
        aspect_stats = terrain.select('aspect').reduceRegion(
            reducer=ee.Reducer.minMaxMean(),
            geometry=region,
            scale=30,
            maxPixels=1e9
        ).getInfo()
        
        # Create tile URL for elevation
        elevation_vis_params = {
            'min': 0,
            'max': 3000,
            'palette': ['006633', 'E5FFCC', '662A00', 'D8D8D8', 'F5F5F5']
        }
        
        elevation_map_id = elevation.getMapId(elevation_vis_params)
        elevation_tile_url = elevation_map_id['tile_fetcher'].url_format
        
        # Create tile URL for slope
        slope_vis_params = {
            'min': 0,
            'max': 60,
            'palette': ['f7fcb9', 'addd8e', '31a354']
        }
        
        slope_map_id = terrain.select('slope').getMapId(slope_vis_params)
        slope_tile_url = slope_map_id['tile_fetcher'].url_format
        
        return {
            "elevation": {
                "min_meters": elevation_stats.get('elevation_min'),
                "max_meters": elevation_stats.get('elevation_max'),
                "mean_meters": elevation_stats.get('elevation_mean'),
                "tile_url": elevation_tile_url
            },
            "slope": {
                "min_degrees": slope_stats.get('slope_min'),
                "max_degrees": slope_stats.get('slope_max'),
                "mean_degrees": slope_stats.get('slope_mean'),
                "tile_url": slope_tile_url
            },
            "aspect": {
                "min_degrees": aspect_stats.get('aspect_min'),
                "max_degrees": aspect_stats.get('aspect_max'),
                "mean_degrees": aspect_stats.get('aspect_mean')
            }
        }
    
    except Exception as e:
        logger.error(f"Error fetching topography data: {e}")
        return {"error": str(e)}

def get_landcover_data(region, year=2021):
    """
    Fetch land cover data (land cover classes, vegetation statistics) for a region.
    
    Args:
        region (ee.Geometry): The region of interest
        year (int): Year to use for land cover data
        
    Returns:
        dict: Dictionary containing land cover and vegetation data
    """
    try:
        # ESA WorldCover for land cover classification
        worldcover = ee.ImageCollection("ESA/WorldCover/v200").first()
        
        # MODIS Land Cover Type
        modis_landcover = ee.ImageCollection("MODIS/061/MCD12Q1") \
            .filter(ee.Filter.calendarRange(year, year, 'year')).first() \
            .select('LC_Type1')
        
        # MODIS Vegetation Continuous Fields
        modis_vcf = ee.ImageCollection("MODIS/061/MOD44B") \
            .filter(ee.Filter.calendarRange(year, year, 'year')).first() \
            .select(['Percent_Tree_Cover', 'Percent_NonTree_Vegetation', 'Percent_NonVegetated'])
        
        # Calculate area and percentage of each land cover class
        area_image = ee.Image.pixelArea().divide(10000)  # Convert to hectares
        
        # Get total area
        total_area = area_image.reduceRegion(
            reducer=ee.Reducer.sum(),
            geometry=region,
            scale=10,  # WorldCover resolution
            maxPixels=1e9
        ).get('area').getInfo()
        
        # Define land cover classes for ESA WorldCover
        worldcover_classes = {
            10: "Tree cover",
            20: "Shrubland",
            30: "Grassland",
            40: "Cropland",
            50: "Built-up",
            60: "Bare / sparse vegetation",
            70: "Snow and ice",
            80: "Permanent water bodies",
            90: "Herbaceous wetland",
            95: "Mangroves",
            100: "Moss and lichen"
        }
        
        # Calculate area for each land cover class
        landcover_stats = {}
        for class_value, class_name in worldcover_classes.items():
            class_mask = worldcover.eq(class_value)
            class_area = area_image.updateMask(class_mask).reduceRegion(
                reducer=ee.Reducer.sum(),
                geometry=region,
                scale=10,
                maxPixels=1e9
            ).get('area')
            
            # Get the area value, handling None
            area_value = 0 if class_area is None else class_area.getInfo()
            
            # Calculate percentage
            percentage = 0 if total_area == 0 else (area_value / total_area) * 100;
            
            landcover_stats[class_name] = {
                "area_hectares": area_value,
                "percentage": percentage
            }
        
        # Get vegetation statistics
        veg_stats = modis_vcf.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=region,
            scale=250,  # MODIS VCF resolution
            maxPixels=1e9
        ).getInfo()
        
        # Create tile URL for land cover
        worldcover_vis_params = {
            'min': 0,
            'max': 100,
            'palette': [
                '006400', '29C012', '77A112', 'FFFF4C', 'FFCCCC',
                'FF0000', '800000', '0000FF', '0067A5', '00A580', 'A5E194'
            ]
        }
        
        landcover_map_id = worldcover.getMapId(worldcover_vis_params)
        landcover_tile_url = landcover_map_id['tile_fetcher'].url_format
        
        return {
            "land_cover": {
                "classes": landcover_stats,
                "dominant_class": max(landcover_stats.items(), key=lambda x: x[1]["percentage"])[0],
                "tile_url": landcover_tile_url
            },
            "vegetation": {
                "tree_cover_percent": veg_stats.get('Percent_Tree_Cover'),
                "non_tree_vegetation_percent": veg_stats.get('Percent_NonTree_Vegetation'),
                "non_vegetated_percent": veg_stats.get('Percent_NonVegetated')
            }
        }
    
    except Exception as e:
        logger.error(f"Error fetching climate data: {e}")
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
