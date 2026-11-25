import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import WeatherPage from './pages/WeatherScreen';
import AboutPage from './pages/AboutPage';
export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<WeatherPage />} />
        <Route path="/sobre-nosotros" element={<AboutPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
