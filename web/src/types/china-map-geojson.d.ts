declare module 'china-map-geojson/lib/china' {
  const chinaGeoJson: {
    type: string;
    features: Array<{
      properties?: {
        name?: string;
      };
    }>;
  };

  export default chinaGeoJson;
}
