export const predefinedWmsFixture = () => {
  return [
    {
      url: 'http://wmts1.geoportail.lu/opendata/service',
      label: 'Open Data Webservices WMS',
    },
    {
      url: 'http://ows.terrestris.de/osm-gray/service',
      label: 'OpenStreetMap by Terrestris (Grey)',
    },
    {
      url: 'http://ows.terrestris.de/osm/service',
      label: 'OpenStreetMap by Terrestris (Color)',
    },
  ]
}
