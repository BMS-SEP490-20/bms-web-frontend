import { Routes, Route, Navigate } from 'react-router-dom';
import ServiceCatalogPage from './features/catalog/pages/ServiceCatalogPage';

export default function App() {
  return (
    <Routes>
      <Route path="/services" element={<ServiceCatalogPage />} />
      <Route path="/" element={<Navigate to="/services" replace />} />
      <Route path="*" element={<Navigate to="/services" replace />} />
    </Routes>
  );
}