import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestPasswordReset } from '../../infrastructure/storage/authService';
import '../../App.css';
import TopBar from '../components/TopBar';
import { type UserProfile } from '../components/helpData';

export default function ResetRequestPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [helpProfiles] = useState<UserProfile[]>(['anonymous']);

  const handleSubmit = async () => {
    if (!email.trim()) { setMessage('Veuillez saisir votre email.'); return; }
    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setMessage('Si cet email existe, un lien de réinitialisation a été envoyé.');
    } catch (err: any) {
      setMessage(err.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <TopBar helpPage="login" helpProfiles={helpProfiles} />
      <h2>Mot de passe oublié</h2>
      <p>Saisissez votre email — vous recevrez un lien valable 1 heure.</p>
      <input
        type="email"
        placeholder="Votre email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
        className="page-form-input"
        style={{ marginBottom: '1rem' }}
      />
      {message && (
        <p style={{ color: message.includes('envoyé') ? 'green' : 'red' }}>
          {message}
        </p>
      )}
      <button className="page-button" onClick={handleSubmit} disabled={loading}>
        {loading ? 'Envoi...' : 'Envoyer le lien'}
      </button>
      <div style={{ marginTop: '0.5rem' }}>
        <button className="page-button2" onClick={() => navigate('/login')}>
          Retour à la connexion
        </button>
      </div>
    </div>
  );
}