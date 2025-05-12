# Google Earth Engine Authentication Guide

This guide will help you resolve authentication issues with Google Earth Engine for the TensorFarm NDVI API.

## Step 1: Google Earth Engine Authentication

1. Install the Earth Engine Python API if you haven't already:

    ```
    pip install earthengine-api
    ```

2. Run the Earth Engine authentication command:

    ```
    earthengine authenticate
    ```

3. This will open a web browser where you need to sign in with your Google account
   and grant access permissions.

## Step 2: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)

2. Click on the project selector at the top of the page

3. Click on "NEW PROJECT" in the top-right corner

4. Enter a project name (e.g., "TensorFarm")

5. Note your project ID (it's either auto-generated or you can specify it)

## Step 3: Enable the Earth Engine API

1. Go to [API Library](https://console.cloud.google.com/apis/library) in your project

2. Search for "Earth Engine"

3. Click on "Earth Engine API"

4. Click "ENABLE"

## Step 4: Register for Earth Engine Access

1. Visit [Earth Engine Sign-up](https://signup.earthengine.google.com/)

2. Follow the registration process using the SAME Google account you used earlier

3. Wait for approval (this may be instant or take a few days)

## Step 5: Using with the TensorFarm API

1. Update the main.py file to use your project ID:

    ```python
    ee.Initialize(project='YOUR_PROJECT_ID')  # Replace with your actual project ID
    ```

2. Or run the API with your project ID:
    ```
    start_api.bat YOUR_PROJECT_ID
    ```

## Common Error Messages and Solutions

### "No project found"

-   Specify a project ID when initializing Earth Engine
-   Create a Google Cloud project if you haven't already

### "PERMISSION_DENIED"

-   Make sure you've run `earthengine authenticate`
-   Check that you've registered for Earth Engine
-   Verify that the Earth Engine API is enabled in your project
-   Ensure you have the necessary IAM permissions in your Google Cloud project

### "401 Unauthorized"

-   Run `earthengine authenticate` again as your credentials might have expired
-   Check that your system clock is accurate

## For More Information

Visit the [Earth Engine Python API Setup Guide](https://developers.google.com/earth-engine/guides/python_install)
