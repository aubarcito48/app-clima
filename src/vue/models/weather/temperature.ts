export type TemperatureUnit = 'C' | 'F';

export function displayTemperature(celsius: number, unit: TemperatureUnit): number {
  return unit === 'C' ? celsius : Math.round(((celsius * 9) / 5 + 32) * 10) / 10;
}
