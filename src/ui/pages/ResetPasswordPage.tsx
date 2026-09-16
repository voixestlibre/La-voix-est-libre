import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../App.css';
import TopBar from '../components/TopBar';
import { type UserProfile } from '../components/helpData';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [helpProfiles] = useState<UserProfile[]>(['anonymous']);

  // TODO : réimplémenter avec un système d'email PHP
  // L'ancien mécanisme utilisait des tokens Supabase dans l'URL (#access_token=...)
  // Le nouveau mécanisme enverra un lien avec un token PHP à usage unique

  return (
    <div className="page-container">
      <TopBar helpPage="login" helpProfiles={helpProfiles} />
      <h2>Réinitialisation du mot de passe</h2>
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