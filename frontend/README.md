# TensorFarm Frontend

A modern GIS-like interface built with Next.js, shadcn/ui, Leaflet for maps, and Recharts for data visualization.

## Features

-   50/50 split-screen layout with an interactive map on the left and data visualization on the right
-   Interactive map using Leaflet with sample regions
-   Dynamic charts for visualizing different types of data (NDVI, Temperature, Rainfall, Land Cover)
-   Layer management with toggleable datasets
-   Responsive design that works on both desktop and mobile

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

-   `/components/map` - Contains the Leaflet map implementation
-   `/components/charts` - Contains the data visualization components using Recharts
-   `/components/ui` - Contains shadcn UI components
-   `/public/leaflet` - Contains Leaflet marker assets

## Usage

1. Click on any marker on the map to select a region
2. View the time series data for the selected region in the right panel
3. Switch between "Time Series View" and "Layer Management" tabs
4. Toggle visibility of different data layers (NDVI, Temperature, Rainfall, Land Cover)

## Integration with Backend

This frontend is designed to work with the TensorFarm backend. The map can be configured to fetch real geospatial data from the backend API when available.
