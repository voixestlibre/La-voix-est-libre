import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './ui/pages/HomePage';
import CreationPage from './ui/pages/CreationPage';



import ChefPage from './ui/pages/ChefPage';
import SingerPage from './ui/pages/SingerPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create" element={<CreationPage />} />  

        
              
        <Route path="/chef" element={<ChefPage />} />
        <Route path="/singer" element={<SingerPage />} />
      </Routes>
    </BrowserRouter>
  );
}