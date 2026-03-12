import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { setSessionFromHash, resetPassword } from '../../infrastructure/storage/authService';
import '../../App.css';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
  
    if (!accessToken) {
      setMessage("Lien invalide ou expiré. Veuillez refaire une demande de réinitialisation.");
      return;
    }
  
    setSessionFromHash(accessToken, refreshToken || '')
      .then(() => setReady(true))
      .catch(() => setMessage("Session invalide. Veuillez refaire une demande de réinitialisation."));
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
      <div className="top-bar">
        <Link to="/" className="navigation">
          <i className="fa fa-chevron-left"></i>
        </Link>
      </div>
      <h2>Réinitialisation du mot de passe</h2>

      {ready && !success && (
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Nouveau mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="page-form-input"
          />
          <button type="submit" className="page-button" disabled={loading}>
            {loading ? 'Réinitialisation...' : 'Valider'}
          </button>
        </form>
      )}
      {message && (
        <div>
          <p>{message}</p>
          <Link to="/login">
            <button className="page-button">Se connecter</button>
          </Link>
        </div>
      )}
    </div>
  );
}