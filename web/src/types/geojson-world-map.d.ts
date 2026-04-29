declare module 'geojson-world-map/lib/world.js' {
  const worldGeoJson: {
    type: string;
    features?: Array<{
      properties?: {
        name?: string;
      };
    }>;
  };

  export default worldGeoJson;
}
