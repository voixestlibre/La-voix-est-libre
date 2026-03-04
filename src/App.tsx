import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './ui/pages/HomePage';
import CreationPage from './ui/pages/CreationPage';
import LoginPage from './ui/pages/LoginPage';
import ResetRequestPage from './ui/pages/ResetRequestPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create" element={<CreationPage />} />  
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-request" element={<ResetRequestPage />} />
      </Routes>
    </BrowserRouter>
  );
}