import { useState, useEffect } from 'react';
import { getCurrentUser, requestPasswordReset } from '../../infrastructure/storage/authService';
import '../../App.css';
import TopBar from '../components/TopBar';
import { type UserProfile } from '../components/helpData';

export default function RequestResetPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [helpProfiles] = useState<UserProfile[]>(['anonymous']);

  useEffect(() => {
    const getUser = async () => {
      // getCurrentUser() est appelé uniquement pour forcer le chargement de la session Supabase
      // avant d'afficher le formulaire — le résultat n'est pas utilisé.
      await getCurrentUser();
      setPageLoading(false);
    };
    getUser();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    // Le message de confirmation est intentionnellement vague ("Si cet email est connu...")
    // pour éviter de révéler si un email est enregistré dans la base ou non.
    // C'est une bonne pratique de sécurité pour les formulaires de réinitialisation de mot de passe.
    try {
      await requestPasswordReset(email);
      setMessage('Si cet email est connu, vous allez recevoir un email avec un lien pour réinitialiser votre mot de passe.');
    } catch {
      setMessage('Erreur lors de la demande de réinitialisation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <TopBar helpPage="login" helpProfiles={helpProfiles} />
      <h2>Réinitialiser le mot de passe</h2>

      {pageLoading || loading ? <div className="spinner"></div> : (
        <>
          {!message && (
            <form onSubmit={handleSubmit}>
              <input type="email" placeholder="Votre email" value={email}
                onChange={(e) => setEmail(e.target.value)} required className="page-form-input" />
              <button type="submit" className="page-button">
                Réinitialiser
              </button>
            </form>
          )}
          {message && <p>{message}</p>}
        </>
      )}
    </div>
  );
}