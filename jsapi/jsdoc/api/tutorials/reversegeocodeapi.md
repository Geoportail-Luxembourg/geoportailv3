## Overview

Reverse geocoding allows you to convert coordinates (either LUREF or WGS84) back to human-readable addresses. This service finds the nearest address to a given point.

## Endpoint

**URL:** `/geocode/reverse`  
**Method:** GET  
**Response Format:** JSON

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `easting` | number | Yes* | - | East Coordinate in LUREF Coordinates |
| `northing` | number | Yes* | - | North Coordinate in LUREF Coordinates |
| `lat` | number | Yes* | - | Latitude in WGS84 Coordinates (alternative) |
| `lon` | number | Yes* | - | Longitude in WGS84 Coordinates (alternative) |
| `dc` | number | No | - | Random number (optional) to prevent caching |
| `cb` | string | No | - | Callback function name. If specified return JSONP rather than JSON |

*Either `easting`/`northing` OR `lat`/`lon` must be provided.

## Example Requests

### Using LUREF Coordinates

```
//apiv4.geoportail.lu/geocode/reverse?easting=80000&northing=80000
```

### Using WGS84 Coordinates

```
//apiv4.geoportail.lu/geocode/reverse?lon=6.11249&lat=49.61055
```

## Response Format

- **count**: Number of results found
- **results**: List ordered by ascending distance
  - **distance**: distance in meters to the address
  - **geom**: GeoJSON object with coordinates in LUREF
  - **geomlonlat**: GeoJSON object with coordinates in WGS84 Lat/Lon
  - **name**: formatted address string
  - **easting**: East Coordinate in LUREF coordinates
  - **northing**: North Coordinates in LUREF coordinates
  - **address**: formatted address string
  - **zip**: Postcode
  - **Locality**: locality
  - **id_caclr_street**: Street ID in national Address DB
  - **street**: street name
  - **postnumber**: house number
  - **id_caclr_building**: Building ID in national Address DB

## Example Response

```json
{
  "count": 1,
  "results": [
    {
      "id_caclr_street": "19",
      "id_caclr_bat": "1088",
      "street": "Avenue Gaston Diderich",
      "number": "54",
      "locality": "Luxembourg",
      "postal_code": "1420",
      "country": "Luxembourg",
      "country_code": "lu",
      "distance": 10.4646819204298,
      "contributor": "ACT",
      "geom": {
        "type": "Point",
        "coordinates": [75982.8968, 75113.6107995489]
      },
      "geomlonlat": {
        "type": "Point",
        "coordinates": [6.11254086249795, 49.6106380870988]
      }
    }
  ]
}
```

## Features

- **Coordinate System Support**: Accepts both LUREF and WGS84 coordinates
- **Distance Calculation**: Results include distance to the nearest address
- **Dual Format Output**: Returns coordinates in both LUREF and WGS84 formats
- **Address Details**: Provides complete address information including building and street IDs