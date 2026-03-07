import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './ui/pages/HomePage';
import ChoirCreationPage from './ui/pages/ChoirCreationPage';
import ChoirsListPage from './ui/pages/ChoirsListPage';
import ChoirDeletePage from './ui/pages/ChoirDeletePage';
import ChoirLeavePage from './ui/pages/ChoirLeavePage';
import ChoirPage from './ui/pages/ChoirPage';
import ChoirJoinPage from './ui/pages/ChoirJoinPage';
import SongCreationPage from './ui/pages/SongCreationPage';
import SongPage from './ui/pages/SongPage';
import LoginPage from './ui/pages/LoginPage';
import ResetRequestPage from './ui/pages/ResetRequestPage';
import ResetPasswordPage from './ui/pages/ResetPasswordPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create-choir" element={<ChoirCreationPage />} />  
        <Route path="/my-choirs" element={<ChoirsListPage />} />  
        <Route path="/delete-choir/:id" element={<ChoirDeletePage />} />  
        <Route path="/leave-choir/:id" element={<ChoirLeavePage />} />  
        <Route path="/choir/:id" element={<ChoirPage />} />  
        <Route path="/join-choir" element={<ChoirJoinPage />} />  
        <Route path="/add-song/:choirId" element={<SongCreationPage />} />  
        <Route path="/song/:songId" element={<SongPage />} />  
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-request" element={<ResetRequestPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Routes>
    </BrowserRouter>
  );
}