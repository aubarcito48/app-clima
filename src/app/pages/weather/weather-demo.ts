import { WeatherPreview } from '../../models/weather-preview';

// Datos y consejos ficticios y fijos. No se consulta una API ni IA.
export const WEATHER_DEMOS: readonly WeatherPreview[] = [
  {
    city: 'Córdoba',
    country: 'Argentina',
    dateLabel: 'Sábado 24 de octubre',
    updatedAt: '14:00',
    temperature: 24,
    feelsLike: 25,
    humidity: 48,
    wind: 12,
    condition: 'cloud-sun',
    description: 'Algo nublado',
    forecast: [
      { time: '15:00', temperature: 25, condition: 'cloud-sun', description: 'Algo nublado' },
      { time: '18:00', temperature: 23, condition: 'sun', description: 'Despejado' },
      { time: '21:00', temperature: 19, condition: 'moon', description: 'Noche despejada' },
      { time: '00:00', temperature: 17, condition: 'moon', description: 'Noche despejada' },
    ],
    advice: {
      heading: 'Una tarde para salir un rato.',
      text: 'Con 24 °C y una brisa suave, es un buen momento para caminar o tomar unos mates al aire libre. Si volvés de noche, llevá un abrigo liviano.',
      tips: ['Ropa liviana durante la tarde', 'Un abrigo para la vuelta'],
    },
  },
  {
    city: 'Buenos Aires',
    country: 'Argentina',
    dateLabel: 'Sábado 24 de octubre',
    updatedAt: '14:00',
    temperature: 18,
    feelsLike: 17,
    humidity: 81,
    wind: 21,
    condition: 'rain',
    description: 'Lluvia ligera',
    forecast: [
      { time: '15:00', temperature: 18, condition: 'rain', description: 'Lluvia ligera' },
      { time: '18:00', temperature: 17, condition: 'cloud', description: 'Nublado' },
      { time: '21:00', temperature: 15, condition: 'cloud', description: 'Nublado' },
      { time: '00:00', temperature: 14, condition: 'cloud', description: 'Nublado' },
    ],
    advice: {
      heading: 'Hoy, el paraguas sale con vos.',
      text: 'La lluvia ligera y el viento pueden hacer que la tarde se sienta más fresca. Si tenés que salir, sumá una campera y calzado que tolere el agua.',
      tips: ['Paraguas a mano', 'Campera y calzado cerrado'],
    },
  },
  {
    city: 'Mendoza',
    country: 'Argentina',
    dateLabel: 'Sábado 24 de octubre',
    updatedAt: '14:00',
    temperature: 27,
    feelsLike: 26,
    humidity: 25,
    wind: 9,
    condition: 'sun',
    description: 'Despejado',
    forecast: [
      { time: '15:00', temperature: 28, condition: 'sun', description: 'Despejado' },
      { time: '18:00', temperature: 25, condition: 'sun', description: 'Despejado' },
      { time: '21:00', temperature: 20, condition: 'moon', description: 'Noche despejada' },
      { time: '00:00', temperature: 16, condition: 'moon', description: 'Noche despejada' },
    ],
    advice: {
      heading: 'Sol de sobra para tus planes.',
      text: 'La tarde cálida y seca invita a estar afuera. Buscá sombra para descansar y llevá agua. Más tarde baja la temperatura: un abrigo liviano puede venir bien.',
      tips: ['Agua para acompañar la tarde', 'Sombra para hacer una pausa'],
    },
  },
];
