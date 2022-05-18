export const getConfig = () => ({
  "pytreeLidarprofileJsonUrl":"http://localhost:5000/",
  "loaded":false,
  "clientConfig":{
    "autoWidth":true,
    "margin":{
      "left":40,
      "top":10,
      "right":200,
      "bottom":40
    },
    "pointAttributes":{ },
    "pointSum":0,
    "tolerance":5
  },
  "serverConfig":
    {
    "classification_colors": {
      "2": {
        "color": "160, 82, 40",
        "name": "sol",
        "value": "sol",
        "visible": 1
      },
      "4": {
        "color": "0, 204, 0",
        "name": "v\u00e9g\u00e9tation <2m",
        "value": "v\u00e9g\u00e9tation <2m",
        "visible": 1
      },
      "5": {
        "color": "0, 150, 0",
        "name": "v\u00e9g\u00e9tation >2m",
        "value": "v\u00e9g\u00e9tation >2m",
        "visible": 1
      },
      "6": {
        "color": "255, 170, 0",
        "name": "toits b\u00e2timents",
        "value": "toits b\u00e2timents",
        "visible": 1
      },
      "14": {
        "color": "255, 255, 0",
        "name": "lignes a\u00e9riennes",
        "value": "lignes a\u00e9riennes",
        "visible": 1
      },
      "17": {
        "color": "255, 0, 0",
        "name": "ponts",
        "value": "ponts",
        "visible": 1
      },
      "22": {
        "color": "120, 120, 120",
        "name": "fa\u00e7ades b\u00e2timents",
        "value": "fa\u00e7ades b\u00e2timents",
        "visible": 1
      },
      "23": {
        "color": "120, 120, 120",
        "name": "murs",
        "value": "murs",
        "visible": 1
      },
      "40": {
        "color": "140, 180, 250",
        "name": "sol sous lac (lidar)",
        "value": "sol sous lac (lidar)",
        "visible": 1
      },
      "41": {
        "color": "60, 130, 250",
        "name": "surface lac (429.3m)",
        "value": "surface lac (429.3m)",
        "visible": 1
      },
      "42": {
        "color": "60, 130, 250",
        "name": "sol sous lac (sonar)",
        "value": "sol sous lac (sonar)",
        "visible": 1
      }
    },
    "debug": false,
    "default_attribute": "CLASSIFICATION",
    "default_color": "RGB(250,150,150)",
    "default_point_attribute": "CLASSIFICATION",
    "default_point_cloud": "luxembourg",
    "initialLOD": 6,
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
        "max": 12,
        "width": 3
      },
      "100": {
        "max": 11,
        "width": 3
      },
      "150": {
        "max": 10,
        "width": 4
      },
      "250": {
        "max": 9,
        "width": 4
      },
      "350": {
        "max": 9,
        "width": 4
      },
      "500": {
        "max": 8,
        "width": 5
      },
      "1000": {
        "max": 8,
        "width": 5
      },
      "5000": {
        "max": 7,
        "width": 6
      },
      "7500": {
        "max": 6,
        "width": 6
      },
      "100000": {
        "max": 6,
        "width": 7
      }
    },
    "max_point_number": 75000,
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
