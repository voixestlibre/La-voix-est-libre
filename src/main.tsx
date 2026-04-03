// Import des dépendances React nécessaires au rendu
import React from 'react';
import ReactDOM from 'react-dom/client';

// Composant racine de l'application
import App from './App';

// Import des styles globaux
import './App.css'; 

// Création de la racine React (React 18+)
ReactDOM.createRoot(document.getElementById('root')!).render(
  // StrictMode permet de détecter certains problèmes potentiels en développement
  <React.StrictMode>
    {/* Point d'entrée de toute l'application */}
    <App />
  </React.StrictMode>
);