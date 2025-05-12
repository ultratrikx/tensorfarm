"""
Test script to verify Earth Engine authentication is working correctly.
Run this script to ensure you can access Earth Engine before using the API.

Usage:
  python test_ee.py [project_id]
  
  Where [project_id] is your Google Cloud project ID (optional)
"""

import ee
import time
import json
import sys
from datetime import datetime

def test_ee_connection(project_id=None):
    """
    Test Earth Engine connection with detailed error handling
    
    Args:
        project_id: Optional Google Cloud project ID to use for Earth Engine
    """
    print("Testing Earth Engine connection...")
    print(f"Using project ID: {project_id if project_id else 'Default'}")
    
    try:
        # Initialize Earth Engine with the provided project ID
        ee.Initialize(project=project_id)
        print("Earth Engine initialized successfully!")
        
        # Simple test: Get info about a dataset
        print("Testing access to Sentinel-2 data...")
        dataset = ee.ImageCollection("COPERNICUS/S2_SR")
        info = dataset.limit(1).getInfo()
        
        print(f"Successfully retrieved data from Earth Engine!")
        print(f"Dataset name: {info['features'][0]['id']}")
        print(f"Number of bands: {len(info['features'][0]['bands'])}")
        
        # Test creating a simple geometry and computing NDVI
        print("\nTesting NDVI computation...")
        
        # Create a simple polygon (example coordinates)
        polygon = ee.Geometry.Polygon([[
            [-80.0, 43.6], 
            [-80.0, 43.61], 
            [-79.99, 43.61], 
            [-79.99, 43.6], 
            [-80.0, 43.6]
        ]])        # Get current date and 6 months ago
        # Use a specific date string for reliability
        current_date = ee.Date('2025-05-01')  # A fixed date in the current year
        six_months_ago = ee.Date('2024-11-01')  # 6 months before
        
        # Load Sentinel-2 data
        s2 = ee.ImageCollection("COPERNICUS/S2_SR") \
            .filterDate(six_months_ago, current_date) \
            .filterBounds(polygon) \
            .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
        
        # Check if we got any images
        image_count = s2.size().getInfo()
        print(f"Found {image_count} images for the test area")
        
        if image_count > 0:
            # Compute NDVI for the first image
            first_image = ee.Image(s2.first())
            ndvi = first_image.normalizedDifference(['B8', 'B4']).rename('NDVI')
            
            # Get map ID for visualization (this tests the tile URL generation)
            vis_params = {
                'min': 0, 
                'max': 1, 
                'palette': ['red', 'yellow', 'green']
            }
            
            map_id = ndvi.getMapId(vis_params)
            tile_url = map_id['tile_fetcher'].url_format
            
            print("NDVI tile URL successfully generated!")
            print(f"Example tile URL: {tile_url}")
        else:
            print("No images found for the test area. Try a different area or time range.")
        
        return True
        
    except Exception as e:
        error_msg = str(e)
        print(f"Error connecting to Earth Engine: {error_msg}")
        
        print("\n=== TROUBLESHOOTING GUIDE ===")
        
        if "no project found" in error_msg:
            print("ERROR: No Google Cloud project specified or found")
            print("SOLUTION:")
            print("  1. Create a project at https://console.cloud.google.com/")
            print("  2. Run this script with your project ID: python test_ee.py YOUR_PROJECT_ID")
            print("  3. Or update main.py to specify your project ID in ee.Initialize()")
        
        elif "PERMISSION_DENIED" in error_msg:
            print("ERROR: Permission denied accessing Earth Engine")
            print("SOLUTION:")
            print("  1. Make sure you've run 'earthengine authenticate' successfully")
            print("  2. Verify you've registered for Earth Engine at https://signup.earthengine.google.com/")
            print("  3. Enable the Earth Engine API in your Google Cloud project")
            print("  4. Check IAM permissions in your project")
        
        elif "401" in error_msg:
            print("ERROR: Authentication error (401)")
            print("SOLUTION:")
            print("  1. Run 'earthengine authenticate' to refresh your credentials")
            print("  2. Make sure your system clock is accurate")
        
        else:
            print("GENERAL TROUBLESHOOTING STEPS:")
            print("  1. Run 'earthengine authenticate' to set up authentication")
            print("  2. Create a Google Cloud project and enable the Earth Engine API")
            print("  3. Register for Earth Engine access at https://signup.earthengine.google.com/")
            print("  4. Check the Earth Engine status page: https://status.earthengine.google.com/")
        
        print("\nFor detailed setup instructions, visit:")
        print("https://developers.google.com/earth-engine/guides/python_install")
        
        return False

if __name__ == "__main__":
    # Check if project ID is provided as command line argument
    project_id = sys.argv[1] if len(sys.argv) > 1 else None
    
    test_ee_connection(project_id)
