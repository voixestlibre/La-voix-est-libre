// Router React
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Router React
import { useEffect } from 'react';

// Logo utilisé 
import logoUrl from './assets/logo.png';

// Logo utilisé pour offline
import HomePage from './ui/pages/HomePage';
import ChoirCreationPage from './ui/pages/ChoirCreationPage';
import ChoirsListPage from './ui/pages/ChoirsListPage';
import ChoirDeletePage from './ui/pages/ChoirDeletePage';
import ChoirLeavePage from './ui/pages/ChoirLeavePage';
import ChoirPage from './ui/pages/ChoirPage';
import ChoirJoinPage from './ui/pages/ChoirJoinPage';
import ChoirDelegationPage from './ui/pages/ChoirDelegationPage';
import SongEditPage from './ui/pages/SongEditPage';
import SongPage from './ui/pages/SongPage';
import SongDeletePage from './ui/pages/SongDeletePage';
import SongsImportPage from './ui/pages/SongsImportPage';
import EventEditPage from './ui/pages/EventEditPage';
import EventPage from './ui/pages/EventPage';
import EventDeletePage from './ui/pages/EventDeletePage';
import EventLeavePage from './ui/pages/EventLeavePage';
import EventsListPage from './ui/pages/EventsListPage';
import LoginPage from './ui/pages/LoginPage';
import ResetRequestPage from './ui/pages/ResetRequestPage';
import ResetPasswordPage from './ui/pages/ResetPasswordPage';
import UserCreatePage from './ui/pages/UserCreatePage';

// ── Service Worker ─────────────────────────────────────────────
// Forcer la mise à jour du Service Worker si une nouvelle version est disponible
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((reg) => reg.update());
  });
}

export default function App() {
  useEffect(() => {
    // Précharger le logo en base64 pour usage offline
    fetch(logoUrl)
      .then(r => r.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onload = () => {
          // ── Préchargement du logo en base64 (offline) ─────────────────
          localStorage.setItem('app_logo_b64', reader.result as string);
        };
        reader.readAsDataURL(blob);
      })
      .catch(() => {}); // On ignore les erreurs (offline ou autre)
  }, []);

  return (
    // On ignore les erreurs (offline ou autre)
    <BrowserRouter basename={import.meta.env.VITE_BASENAME ?? '/'}>
      <Routes>
        {/* ── Pages principales ───────────────────────── */}
        <Route path="/" element={<HomePage />} />

        {/* ── Gestion des chorales ────────────────────── */}
        <Route path="/create-choir" element={<ChoirCreationPage />} />  
        <Route path="/my-choirs" element={<ChoirsListPage />} />  
        <Route path="/delete-choir/:id" element={<ChoirDeletePage />} />  
        <Route path="/leave-choir/:id" element={<ChoirLeavePage />} />  
        <Route path="/choir/:id" element={<ChoirPage />} />  
        <Route path="/join-choir/:code?" element={<ChoirJoinPage />} />
        <Route path="/choir-delegation/:choirId" element={<ChoirDelegationPage />} />

        {/* ── Gestion des chants ─────────────────────── */}
        <Route path="/add-song/:choirId" element={<SongEditPage />} />  
        <Route path="/edit-song/:songId" element={<SongEditPage />} />  
        <Route path="/song/:songId" element={<SongPage />} />  
        <Route path="/delete-song/:id" element={<SongDeletePage />} />  
        <Route path="/import-songs/:choirId" element={<SongsImportPage />} />

        {/* ── Gestion des événements ─────────────────── */}
        <Route path="/add-event/:choirId" element={<EventEditPage />} />
        <Route path="/edit-event/:eventId" element={<EventEditPage />} />
        <Route path="/event/:eventId" element={<EventPage />} />
        <Route path="/delete-event/:eventId" element={<EventDeletePage />} />
        <Route path="/leave-event/:eventId" element={<EventLeavePage />} />
        <Route path="/my-events" element={<EventsListPage />} />  

        {/* ── Authentification ───────────────────────── */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-request" element={<ResetRequestPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/create-user" element={<UserCreatePage />} />
      </Routes>
    </BrowserRouter>
  );
}