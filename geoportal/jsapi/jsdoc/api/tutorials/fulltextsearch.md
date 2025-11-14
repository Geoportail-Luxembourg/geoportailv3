## Overview

The Full Text Search API enables searching for geographic points of interest (POI) and features across Luxembourg's geospatial data. It provides intelligent search with fuzzy matching, spatial filtering, and role-based access control.

## Endpoint

**URL:** `/fulltextsearch`  
**Method:** GET  
**Response Format:** GeoJSON FeatureCollection

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `query` | string | **Yes** | - | Search term or phrase |
| `limit` | integer | No | 30 | Maximum number of results (max: 200) |
| `fuzziness` | integer | No | 1 | Fuzzy matching level (0-1) |
| `layer` | string | No | - | Comma-separated list of layer names to filter by |
| `extent` | string | No | - | Bounding box as "minX,minY,maxX,maxY" to limit spatial search |


### Fuzzy matching Key Points

- **`fuzziness=0`**: Exact matches only - no tolerance for typos
- **`fuzziness=1`**: Allows for minor spelling variations and typos (default behavior)
- **Use case**: Fuzzy matching is particularly useful for user-facing search interfaces where users might make

## Available Layers

The search operates across multiple layer types with different priority levels:

### High Priority Layers (Most Relevant)
- **Commune** (boost: 10) - Municipalities
- **Localité** (boost: 9) - Localities and towns
- **Adresse** (boost: 8) - Street addresses
- **lieu_dit** (boost: 7) - Place names and landmarks

### Medium Priority Layers
- **nom_de_rue** (boost: 2) - Street names

### Standard Priority Layers
- **Parcelle** (boost: 1) - Land parcels
- **FLIK** (boost: 1) - Agricultural reference parcels

### Background Layers (Lower Priority)
- **asta_esp** (boost: 0) - Administrative spatial data
- **hydro** (boost: 0) - Hydrographic features
- **hydro_km** (boost: 0) - Hydrographic kilometer markers
- **biotope** (boost: 0) - Biotope areas

## Example Requests

### Basic Search
```
GET /fulltextsearch?query=Luxembourg
```

### Search with Limit and Fuzziness
```
GET /fulltextsearch?query=Esch&limit=10&fuzziness=0
```

### Search Specific Layers
```
GET /fulltextsearch?query=charles%20darwin&layer=Adresse,nom_de_rue
```

### Spatial Search within Bounding Box
```
GET /fulltextsearch?query=luxembourg&extent=6.1032565254117195%2C49.59595223854373%2C6.139198126211281%2C49.60315620514581
```

## Example Response

```json

{
    "type": "FeatureCollection", 
    "features": [
        {
            "type": "Feature", 
            "bbox": [6.1201117205, 49.5916379187, 6.1477909001, 49.6096278955], 
            "id": "3067242", 
            "geometry": {
                "type": "Polygon", 
                "coordinates": [[
                    [6.120129038, 49.591637919], 
                    [6.12011172, 49.609619944], 
                    [6.147783756, 49.609627895], 
                    [6.1477909, 49.591645865], 
                    [6.120129038, 49.591637919]]]
                    }, 
            "properties": {
                "label": "Luxembourg-Gare (Gare)", 
                "layer_name": "Localité"
                }
        }
    ]
}
```

## Response Format

Each feature in the response includes:

- **id**: Unique identifier for the feature
- **geometry**: GeoJSON geometry (Point, Polygon, etc.)
- **properties**:
  - **label**: Display name of the feature
  - **layer_name**: Source layer name
- **bbox**: Bounding box coordinates (for non-point geometries)

## Search Features

### Intelligent Ranking
Results are automatically ranked by relevance using:
- Layer-specific boost values
- Text matching quality
- Fuzzy matching for typos
- N-gram analysis for partial matches

## Error Responses

| Status Code | Description |
|-------------|-------------|
| 400 | Missing required `query` parameter or invalid `limit` value |
