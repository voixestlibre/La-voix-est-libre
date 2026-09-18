import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { verifyResetToken, resetPassword } from '../../infrastructure/storage/authService';
import '../../App.css';
import TopBar from '../components/TopBar';
import { type UserProfile } from '../components/helpData';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [tokenValid, setTokenValid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [helpProfiles] = useState<UserProfile[]>(['anonymous']);

  useEffect(() => {
    if (!token) {
      setMessage('Lien invalide.');
      setLoading(false);
      return;
    }
    verifyResetToken(token)
      .then(() => { setTokenValid(true); setLoading(false); })
      .catch(() => { setMessage('Lien invalide ou expiré.'); setLoading(false); });
  }, [token]);

  const handleSubmit = async () => {
    if (password.length < 6) {
      setMessage('Le mot de passe doit faire au moins 6 caractères.');
      return;
    }
    if (password !== confirm) {
      setMessage('Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password);
      setMessage('Mot de passe réinitialisé. Vous pouvez vous connecter.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setMessage(err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <TopBar helpPage="login" helpProfiles={helpProfiles} />
      <h2>Nouveau mot de passe</h2>
      {loading && <div className="spinner"></div>}
      {!loading && !tokenValid && (
        <p style={{ color: 'red' }}>{message}</p>
      )}
      {!loading && tokenValid && (
        <>
          <input
            type="password"
            placeholder="Nouveau mot de passe (6 caractères min.)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="page-form-input"
            style={{ marginBottom: '0.5rem' }}
          />
          <input
            type="password"
            placeholder="Confirmer le mot de passe"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            className="page-form-input"
            style={{ marginBottom: '1rem' }}
          />
          {message && (
            <p style={{ color: message.includes('réinitialisé') ? 'green' : 'red' }}>
              {message}
            </p>
          )}
          <button className="page-button" onClick={handleSubmit} disabled={loading}>
            Valider
          </button>
        </>
      )}
      <div style={{ marginTop: '0.5rem' }}>
        <button className="page-button2" onClick={() => navigate('/login')}>
          Retour à la connexion
        </button>
      </div>
    </div>
  );
}