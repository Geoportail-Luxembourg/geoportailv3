export const getConfig = () => ({
  "pytreeLidarprofileJsonUrl":null,
  "loaded":false,
  "clientConfig":{
    "autoWidth":true,
    "margin":{
      "left":40,
      "top":10,
      "right":0,
      "bottom":40
    },
    "pointAttributes":{ },
    "pointSum":0,
    "tolerance":5
  },
  "serverConfig":
    {
        "1": {
          "color": "120, 120, 120",
          "name": {
            "fr": "points non classifiés",
            "en": "unclassified points",
            "de": "nicht klassifizierte Punkte",
            "lb": "onklass\u00e9iert Punkten",
          },
          "value": "unclassified points",
          "visible": 1
        },
        "2": {
          "color": "160, 82, 40",
          "name": {
            "fr": "sol",
            "en": "ground",
            "de": "Boden",
            "lb": "Buedem",
          },
          "value": "ground",
          "visible": 1
        },
        "3": {
          "color": "0, 240, 0",
          "name": {
            "fr": "v\u00e9g\u00e9tation basse",
            "en": "low vegetation",
            "de": "niedrige Vegetation",
            "lb": "niddereg Vegetatioun",
          },
          "value": "low vegetation",
          "visible": 1
        },
        "4": {
          "color": "0, 204, 0",
          "name": {
            "fr": "v\u00e9g\u00e9tation moyenne",
            "en": "average vegetation",
            "de": "mittlere Vegetation",
            "lb": "m\u00e9ttel Vegetatioun",
          },
          "value": "average vegetation",
          "visible": 1
        },
        "5": {
          "color": "0, 150, 0",
          "name": {
            "fr": "v\u00e9g\u00e9tation haute",
            "en": "high vegetation",
            "de": "hohe Vegetation",
            "lb": "h\u00e9ich Vegetatioun",
          },
          "value": "high vegetation",
          "visible": 1
        },
        "6": {
          "color": "255, 170, 0",
          "name": {
            "fr": "b\u00e2timents",
            "en": "buildings",
            "de": "Geb\u00e4ude",
            "lb": "Gebai",
          },
          "value": "buildings",
          "visible": 1
        },
        "7": {
          "color": "0, 0, 0",
          "name": {
            "fr": "points bas (bruit)",
            "en": "low points (noise)",
            "de": "niedrige Punkte",
            "lb": "niddereg Punkten",
          },
          "value": "low points (noise)",
          "visible": 1
        },
        "9": {
          "color": "60, 130, 250",
          "name": {
            "fr": "eau",
            "en": "water",
            "de": "Wasser",
            "lb": "Waasser",
          },
          "value": "water",
          "visible": 1
        },
        "13": {
          "color": "255, 0, 0",
          "name": {
            "fr": "ponts, passerelles, viaducs",
            "en": "bridges",
            "de": "Br\u00fccken",
            "lb": "Br\u00e9cke",
          },
          "value": "bridges",
          "visible": 1
        },
        "15": {
          "color": "255, 255, 0",
          "name": {
            "fr": "lignes \u00e0 haute tension",
            "en": "high voltage lines",
            "de": "Hochspannungsleitung",
            "lb": "h\u00e9ich Volt Linn",
          },
          "value": "high voltage lines",
          "visible": 1
        },
      },
      "debug": false,
      "default_attribute": "CLASSIFICATION",
      "default_color": "RGB(250,150,150)",
      "default_point_attribute": "CLASSIFICATION",
      "default_point_cloud": "luxembourg",
      "initialLOD": 10,
      "max_levels": {
        "25": {
          "max": 14,
          "width": 2
        },
        "50": {
          "max": 13,
          "width": 2
        },
        "75": {
          "max": 13,
          "width": 3
        },
        "100": {
          "max": 12,
          "width": 3
        },
        "150": {
          "max": 12,
          "width": 4
        },
        "250": {
          "max": 11,
          "width": 4
        },
        "350": {
          "max": 11,
          "width": 4
        },
        "500": {
          "max": 10,
          "width": 5
        },
        "1000": {
          "max": 10,
          "width": 5
        },
        "5000": {
          "max": 9,
          "width": 6
        },
        "7500": {
          "max": 9,
          "width": 6
        },
        "100000": {
          "max": 9,
          "width": 7
        }
      },
      "max_point_number": 150000,
      "minLOD": 0,
      "point_attributes": {
        "CLASSIFICATION": {
          "bytes": 1,
          "elements": 1,
          "name": "Classification",
          "value": "CLASSIFICATION",
          "visible": 1
        },
        "COLOR_PACKED": {
          "bytes": 4,
          "elements": 4,
          "name": "Couleur",
          "value": "COLOR_PACKED",
          "visible": 1
        },
        "INTENSITY": {
          "bytes": 2,
          "element": 1,
          "name": "Intensit\u00e9",
          "value": "INTENSITY",
          "visible": 1
        },
        "POSITION_CARTESIAN": {
          "bytes": 12,
          "elements": 3,
          "name": "Position-cartesian",
          "value": "POSITION_CARTESIAN",
          "visible": 0
        },
        "POSITION_PROJECTED_PROFILE": {
          "bytes": 8,
          "elements": 2,
          "name": "Position-projected",
          "value": "POSITION_PROJECTED_PROFILE",
          "visible": 0
        },
        "RGB": {
          "bytes": 3,
          "elements": 4,
          "name": "Couleur",
          "value": "RGBA",
          "visible": 0
        }
      },
      "point_size": 1,
      "width": 10
    }
})
