import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, login, signOut } from '../../infrastructure/storage/authService';
import { translateSupabaseError } from '../../infrastructure/storage/translateSupabaseError';
import '../../App.css';
import TopBar from '../components/TopBar';
import { type UserProfile } from '../components/helpData';
import { usePageLoader } from '../hooks/usePageLoader';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [user, setUser] = useState<{ email: string; isAdmin: boolean } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const [helpProfiles] = useState<UserProfile[]>(['anonymous']);

  // Gestion du spinner et des bandeaux réseau
  const { loading, setLoading, showTimeoutBanner, showOfflineBanner,
    setShowOfflineBanner, forceOffline, cancelled } = usePageLoader();  

  // Basculement forcé en mode offline (timeout atteint pendant le spinner)
  useEffect(() => {
    if (!forceOffline) return;
    setLoading(false);
  }, [forceOffline]);

  // Vérifier si l'utilisateur est déjà connecté au chargement
  useEffect(() => {
    // Lancer le spinner
    setLoading(true);

    const init = async () => {
      // Test réseau au chargement
      try {
        await fetch('https://www.larminat.fr/lavoixestlibre/favicon.ico', {
          method: 'HEAD', mode: 'no-cors', cache: 'no-store',
        });
        // Si timeout déclenché
        if (cancelled.current) return;
      } catch {
        // Déclenchement de la bannière Offline
        if (!cancelled.current) setShowOfflineBanner(true);
      }
      const currentUser = await getCurrentUser();
      // Si timeout déclenché
      if (cancelled.current) return;

      if (currentUser) {
        setUser({ email: currentUser.email!, isAdmin: false });
      }

      // Si timeout déclenché
      if (cancelled.current) return;

      setLoading(false);
    };
    init();
  }, []);

  // Validation du formulaire de connexion
  // La connexion gère deux cas distincts via la fonction login() :
  // - Utilisateur existant → connexion normale, redirection vers '/'
  // - Nouvel utilisateur créé via MAGIC_SECRET (compte créé par un admin) →
  //   redirection vers '/reset-request' pour définir son mot de passe initial  
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

  // La déconnexion via signOut() invalide la session Supabase côté client.
  // Le localStorage (chorales, événements) n'est PAS effacé lors de la déconnexion
  // pour permettre un accès offline aux données préalablement mémorisées.  
  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="page-container">
      <TopBar helpPage="login" helpProfiles={helpProfiles} 
        showTimeoutBanner={showTimeoutBanner} showOfflineBanner={showOfflineBanner} />

      {loading ? <div className="spinner"></div> : (
        <>
          {user ? (
            <>
              {/* Utilisateur connecté : afficher son email et le bouton de déconnexion */}
              <h2>Déconnexion</h2>
              <p>Utilisateur connecté : {user.email}</p>
              {/* Bouton désactivé si offline ou timeOut */}
              <button type="button" className="page-button" 
                disabled={showOfflineBanner || showTimeoutBanner}
                style={{ opacity: showOfflineBanner || showTimeoutBanner ? 0.5 : 1 }}
                onClick={handleLogout}
              >
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
                {/* Bouton désactivé si offline ou timeOut */}
                <button type="submit" 
                  className="page-button"
                  disabled={showOfflineBanner || showTimeoutBanner}
                  style={{ opacity: showOfflineBanner || showTimeoutBanner ? 0.5 : 1 }}
                >
                  Se connecter
                </button>
              </form>

              {/* Lien vers la réinitialisation du mot de passe */}
              {/* Bouton désactivé si offline ou timeOut */}
              <button type="button" className="page-button2" 
                disabled={showOfflineBanner || showTimeoutBanner}
                style={{ marginTop: '0.5rem', opacity: showOfflineBanner || showTimeoutBanner ? 0.5 : 1 }}
                onClick={() => navigate('/reset-request')}
              >
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