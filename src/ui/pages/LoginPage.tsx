import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, login, signOut } from '../../infrastructure/storage/authService';
import { translateSupabaseError } from '../../infrastructure/storage/translateSupabaseError';
import '../../App.css';
import TopBar from '../components/TopBar';
import { type UserProfile } from '../components/helpData';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState<{ email: string; isAdmin: boolean } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const [helpProfiles] = useState<UserProfile[]>(['anonymous']);

  // Vérifier si l'utilisateur est déjà connecté au chargement
  useEffect(() => {
    const init = async () => {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser({ email: currentUser.email!, isAdmin: false });
      }
      setPageLoading(false);
    };
    init();
  }, []);

  // Validation du formulaire de connexion
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const result = await login(email, password);
      setMessage(result.message);

      if (result.isNewUser) {
        // Nouvel utilisateur créé via MAGIC_SECRET → rediriger vers la réinitialisation du mot de passe
        navigate('/reset-request');
      } else {
        // Utilisateur existant → mettre à jour l'état et rediriger vers l'accueil
        setUser({ email: result.email!, isAdmin: result.isAdmin });
        navigate('/');
      }
    } catch (err: any) {
      setMessage(translateSupabaseError(err.message));
    } finally {
      setLoading(false);
    }
  };

  // Déconnexion
  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="page-container">
      <TopBar helpPage="login" helpProfiles={helpProfiles} />

      {pageLoading || loading ? <div className="spinner"></div> : (
        <>
          {user ? (
            <>
              {/* Utilisateur connecté : afficher son email et le bouton de déconnexion */}
              <h2>Déconnexion</h2>
              <p>Utilisateur connecté : {user.email}</p>
              <button type="button" className="page-button" onClick={handleLogout}>
                Se déconnecter
              </button>
            </>
          ) : (
            <>
              {/* Formulaire de connexion */}
              <h2>Connexion</h2>
              <form onSubmit={handleSubmit}>
                <input type="email" placeholder="Email" value={email}
                  onChange={(e) => setEmail(e.target.value)} required className="page-form-input" />
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="page-form-input"
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <i
                    className={`fa ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', right: '0.8rem', top: '50%',
                      transform: 'translateY(-50%)',
                      cursor: 'pointer', color: '#044C8D', fontSize: '1rem',
                    }}
                  />
                </div>
                <button type="submit" className="page-button">
                  Se connecter
                </button>
              </form>

              {/* Lien vers la réinitialisation du mot de passe */}
              <button type="button" className="page-button2" style={{ marginTop: '0.5rem' }}
                onClick={() => navigate('/reset-request')}>
                Réinitialiser le mot de passe
              </button>
            </>
          )}
          {message && <p style={{ color: 'red' }}>{message}</p>}
        </>
      )}
    </div>
  );
}