import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { setSessionFromHash, resetPassword } from '../../infrastructure/storage/authService';
import '../../App.css';
import TopBar from '../components/TopBar';
import { type UserProfile } from '../components/helpData'; 

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const [helpProfiles] = useState<UserProfile[]>(['anonymous']);

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken) {
      setMessage("Lien invalide ou expiré. Veuillez refaire une demande de réinitialisation.");
      setPageLoading(false);
      return;
    }

    setSessionFromHash(accessToken, refreshToken || '')
      .then(() => { setReady(true); setPageLoading(false); })
      .catch(() => { setMessage("Session invalide. Veuillez refaire une demande de réinitialisation."); setPageLoading(false); });
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await resetPassword(password);
      setMessage('Mot de passe réinitialisé avec succès ! Vous pouvez maintenant vous connecter.');
      setSuccess(true);
      setPassword('');
    } catch (err: any) {
      setMessage(`Erreur : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <TopBar helpPage="login" helpProfiles={helpProfiles} />
      <h2>Réinitialisation du mot de passe</h2>

      {pageLoading || loading ? <div className="spinner"></div> : (
        <>
          {ready && !success && (
            <form onSubmit={handleSubmit}>
              <input type="password" placeholder="Nouveau mot de passe" value={password}
                onChange={(e) => setPassword(e.target.value)} required className="page-form-input" />
              <button type="submit" className="page-button">
                Valider
              </button>
            </form>
          )}
          {message && (
            <div>
              <p>{message}</p>
              <button className="page-button" onClick={() => navigate('/login')}>
                Se connecter
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}