## Overview

The Geocoding API allows you to convert addresses into geographic coordinates. It supports both structured address components and free-form address strings.

## Endpoint

**URL:** `/geocode/search`  
**Method:** GET  
**Response Format:** JSON

## Parameters

### Structured Address Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `num` | string | No | - | House number |
| `street` | string | No | - | Street name |
| `locality` | string | No | - | Locality |
| `zip` | string | No | - | Postcode |
| `dc` | number | No | - | Random number (optional) to prevent caching |
| `cb` | string | No | - | Callback function name. If specified return JSONP rather than JSON |
| `returnParcelInfo` | boolean | No | false | Sends back the parcel number if set to true |

### Alternative: Free-form Address

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `queryString` | string | Yes | - | Formatted address in one string |
| `dc` | number | No | - | Random number |
| `cb` | string | No | - | Callback function name |

## Example Requests

### Structured Address Search

```
//apiv4.geoportail.lu/geocode/search?num=54&street=Avenue%20Gaston%20Diderich&zip=&locality=Luxembourg&_dc=1386599465147&cb=stcCallback1001
```

### Free-form Address Search

```
//apiv4.geoportail.lu/geocode/search?queryString=54,%20avenue%20Gaston%20Diderich,1420%20%20Luxembourg
```

## Response Format

- **success**: success true/false
- **count**: Number of results found
- **results**: List ordered by descending accuracy and ratio
  - **parcel** (optional, according to request parameter returnParcelInfo true/false)
    - **key**: parcel id
    - **label**: parcel label
  - **ratio**: ratio from 0-1. Expresses the certainty of the result, 1 being the maximum
  - **name**: Formatted string representing the address
  - **easting**: East Coordinate in LUREF Coords
  - **northing**: North Coordinate in LUREF Coords
  - **address**: Address String
  - **geom**: GeoJSON Geometry Object with coordinates in LUREF X,Y
  - **geomlonlat**: GeoJSON Geometry Object with coordinates in WGS84 Lat/Lon
  - **matching street**: Name of the street
  - **accuracy**: Codes from 0 - 8 expressing the level of geocoding:
    - 8: at house number level
    - 7: at point of interest level
    - 6: at street level
    - 5: at locality level
    - 1: at national level (Luxembourg)
  - **AddressDetails**: Address Details
    - **zip**: Postcode
    - **Locality**: locality
    - **id_caclr_street**: Street ID in national Address DB
    - **street**: street name
    - **postnumber**: house number
    - **id_caclr_building**: Building ID in national Address DB

## Example Response

```json
{
  "count": 2,
  "results": [
    {
      "ratio": 1.0,
      "name": "54,Avenue Gaston Diderich 1420 Luxembourg",
      "easting": 75983.84375,
      "address": "54 Avenue Gaston Diderich,1420 Luxembourg",
      "geomlonlat": {
        "type": "Point",
        "coordinates": [6.11255434207935, 49.6106117587006]
      },
      "geom": {
        "type": "Point",
        "coordinates": [75983.84375, 75110.6796875]
      },
      "northing": 75110.6796875,
      "AddressDetails": {
        "zip": "1420",
        "locality": "Luxembourg",
        "id_caclr_street": "19",
        "street": "Avenue Gaston Diderich",
        "postnumber": "54",
        "id_caclr_building": "1088"
      },
      "matching street": "Avenue Gaston Diderich",
      "accuracy": 8
    },
    {
      "ratio": 1.0,
      "name": ",Avenue Gaston Diderich 1420 Luxembourg",
      "easting": 75643.185748922406,
      "address": " Avenue Gaston Diderich,1420 Luxembourg",
      "geomlonlat": {
        "type": "Point",
        "coordinates": [6.1078415667193298, 49.6100594816659]
      },
      "geom": {
        "type": "Point",
        "coordinates": [75643.185748922406, 75049.512442753199]
      },
      "northing": 75049.512442753199,
      "AddressDetails": {
        "zip": "1420",
        "locality": "Luxembourg",
        "id_caclr_street": "19",
        "street": "Avenue Gaston Diderich",
        "postnumber": "None",
        "id_caclr_building": ""
      },
      "matching street": "Avenue Gaston Diderich",
      "accuracy": 6
    }
  ],
  "success": true
}
```

## Features

- **Flexible Input**: Supports both structured address components and free-form address strings
- **Accuracy Levels**: Provides accuracy codes from national level down to house number level
- **Coordinate Systems**: Returns coordinates in both LUREF and WGS84 formats
- **Confidence Rating**: Each result includes a ratio indicating the certainty of the match
- **Parcel Information**: Optional parcel details for land registry integration