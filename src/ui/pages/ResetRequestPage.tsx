import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../App.css';
import TopBar from '../components/TopBar';
import { type UserProfile } from '../components/helpData';

export default function ResetRequestPage() {
  const navigate = useNavigate();
  const [helpProfiles] = useState<UserProfile[]>(['anonymous']);

  // TODO : réimplémenter avec un système d'email PHP
  // L'ancien mécanisme utilisait Supabase pour envoyer un email avec un lien de reset
  // Le nouveau mécanisme enverra un lien avec un token PHP à usage unique

  return (
    <div className="page-container">
      <TopBar helpPage="login" helpProfiles={helpProfiles} />
      <h2>Mot de passe oublié</h2>
      <p>
        Cette fonctionnalité est temporairement indisponible.
        Contactez l'administrateur pour réinitialiser votre mot de passe.
      </p>
      <button className="page-button" onClick={() => navigate('/login')}>
        Retour à la connexion
      </button>
    </div>
  );
}