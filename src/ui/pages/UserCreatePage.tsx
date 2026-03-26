import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isCurrentUserAdmin, createUserAccount } from '../../infrastructure/storage/authService';
import '../../App.css';
import TopBar from '../components/TopBar';
import { type UserProfile } from '../components/helpData';

export default function UserCreatePage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [helpProfiles] = useState<UserProfile[]>(['admin']);

  useEffect(() => {
    const init = async () => {
      // Vérifier que l'utilisateur connecté est bien admin
      const admin = await isCurrentUserAdmin();
      if (!admin) {
        navigate('/');
        return;
      }
      setPageLoading(false);
    };
    init();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await createUserAccount(email, password);
      setSuccess(true);
      setMessage('Compte créé avec succès.');
    } catch (err: any) {
      setMessage(`Erreur : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <TopBar helpPage="create-user" helpProfiles={helpProfiles} />
      <h2>Créer un utilisateur</h2>

      {pageLoading ? <div className="spinner"></div> : (
        <>
          {!success ? (
            <form onSubmit={handleSubmit}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="page-form-input"
              />
              <input
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="page-form-input"
              />
              <div style={{ marginTop: '1rem' }}>
                <button type="submit" className="page-button" disabled={loading}>
                  {loading ? 'Création...' : 'Valider'}
                </button>
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <button type="button" className="page-button2" onClick={() => navigate('/')}>
                  Annuler
                </button>
              </div>
              {message && <p style={{ color: 'red', marginTop: '0.5rem' }}>{message}</p>}
            </form>
          ) : (
            <>
              <p style={{ color: 'green' }}>{message}</p>
              {/* Proposer de créer un autre utilisateur ou de retourner à l'accueil */}
              <button
                className="page-button"
                onClick={() => { setSuccess(false); setEmail(''); setPassword(''); setMessage(''); }}
              >
                Créer un autre utilisateur
              </button>
              <div style={{ marginTop: '0.5rem' }}>
                <button className="page-button2" onClick={() => navigate('/')}>
                  Retour à l'accueil
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}