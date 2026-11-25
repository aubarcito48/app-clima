export type WeatherLayer = 'temperature' | 'rain' | 'wind';

// OpenWeather Maps 1.0 default palettes: https://openweathermap.org/api/map_legend
// Positions are explicit: precipitation uses a non-linear visual scale.
export const MAP_LAYERS = {
  temperature: {
    label: 'Temperatura',
    unit: '°C',
    gradient:
      'linear-gradient(90deg, #821692, #8257db 14.3%, #208cec 28.6%, #20c4e8 42.9%, #23dddd 57.1%, #c2ff28 71.4%, #fff028 85.7%, #ffc228 92.9%, #fc8014)',
    ticks: [
      { value: '−40', position: 0 },
      { value: '−20', position: 28.6 },
      { value: '0', position: 57.1 },
      { value: '20', position: 85.7 },
      { value: '30+', position: 100 },
    ],
  },
  rain: {
    label: 'Lluvia',
    unit: 'mm',
    gradient: 'linear-gradient(90deg, #eee9df, #6e6ecd4d 25%, #5050e1b3 60%, #1414ffe6)',
    ticks: [
      { value: '0', position: 0 },
      { value: '1', position: 25 },
      { value: '10', position: 60 },
      { value: '140+', position: 100 },
    ],
  },
  wind: {
    label: 'Viento',
    unit: 'km/h',
    gradient:
      'linear-gradient(90deg, #eee9df, #eecece66 10%, #b364bcb3 30%, #3f213bcc 50%, #744cac)',
    ticks: [
      { value: '0', position: 0 },
      { value: '18', position: 10 },
      { value: '54', position: 30 },
      { value: '90', position: 50 },
      { value: '180+', position: 100 },
    ],
  },
} as const;
