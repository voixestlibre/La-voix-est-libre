import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, login, signOut } from '../../infrastructure/storage/authService';
import { getOwnedChoirs, getChoirsByIds } from '../../infrastructure/storage/choirsService';
import '../../App.css';
import TopBar from '../components/TopBar';
import { type UserProfile } from '../components/helpData';
import { usePageLoader } from '../hooks/usePageLoader';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [user, setUser] = useState<{
    email: string;
    login: string | null;
    isAdmin: boolean;
    choirs_nb: number;
    choirs_delegations: string | null;
  } | null>(null);
  const [ownedChoirs, setOwnedChoirs] = useState<{ id: number; name: string; code: string }[]>([]);
  const [delegatedChoirs, setDelegatedChoirs] = useState<{ id: number; name: string; code: string }[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const [helpProfiles] = useState<UserProfile[]>(['anonymous']);
  const [justLoggedIn, setJustLoggedIn] = useState(false);

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
        setUser({
          email: currentUser.email,
          login: currentUser.login ?? null,
          isAdmin: currentUser.is_admin,
          choirs_nb: currentUser.choirs_nb,
          choirs_delegations: currentUser.choirs_delegations,
        });
      
        // Charger les chorales propriétaires
        try {
          const owned = await getOwnedChoirs(currentUser.id);
          if (!cancelled.current) setOwnedChoirs(owned);
        } catch {}
      
        // Charger les chorales déléguées
        try {
          if (currentUser.choirs_delegations) {
            const ids = currentUser.choirs_delegations.split(',').filter(Boolean);
            if (ids.length > 0) {
              const choirs = await getChoirsByIds(ids);
              if (!cancelled.current) setDelegatedChoirs(choirs);
            }
          }
        } catch {}
      }

      // Si timeout déclenché
      if (cancelled.current) return;

      setLoading(false);
    };
    init();
  }, []);

  // Validation du formulaire de connexion
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
  
    try {
      await login(email, password);
    
      // Récupérer le profil complet depuis la session PHP
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser({
          email: currentUser.email,
          login: currentUser.login ?? null,
          isAdmin: currentUser.is_admin,
          choirs_nb: currentUser.choirs_nb,
          choirs_delegations: currentUser.choirs_delegations,
        });
    
        // Charger les chorales propriétaires
        try {
          const owned = await getOwnedChoirs(currentUser.id);
          setOwnedChoirs(owned);
        } catch {}
    
        // Charger les chorales déléguées
        try {
          if (currentUser.choirs_delegations) {
            const ids = currentUser.choirs_delegations.split(',').filter(Boolean);
            if (ids.length > 0) {
              const choirs = await getChoirsByIds(ids);
              setDelegatedChoirs(choirs);
            }
          }
        } catch {}
      }
    
      setJustLoggedIn(true);
      setTimeout(() => navigate('/'), 2500);
    
    } catch (err: any) {
      setMessage(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }

  };

  // La déconnexion via signOut() invalide la session côté client.
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
              {/* Utilisateur connecté : afficher son email, son profil et le bouton de déconnexion */}
              <h2>{justLoggedIn ? 'Connexion réussie' : 'Déconnexion'}</h2>
              <p style={{ margin: '0.2rem 0' }}>
                <strong>Utilisateur connecté :</strong> {user.email}
              </p>
              {user.login && (
                <p style={{ margin: '0.2rem 0' }}>
                  <strong>Login :</strong> {user.login}
                </p>
              )}

              <div style={{ margin: '1rem 0', borderTop: '1px solid #E6F2FF', paddingTop: '1rem' }}>

                {/* Admin */}
                {user.isAdmin && (
                  <p style={{ margin: '0.3rem 0', color: '#044C8D' }}>
                    <i className="fa fa-shield-halved" style={{ marginRight: '0.5rem' }}></i>
                    Droits d'administration
                  </p>
                )}

                {/* Chorales propriétaires */}
                {ownedChoirs.length > 0 && (
                  <div style={{ margin: '0.5rem 0' }}>
                    <p style={{ margin: '0.2rem 0', fontWeight: 'bold' }}>
                      <i className="fa fa-music" style={{ color: '#DA486D', marginRight: '0.5rem' }}></i>
                      Chorale{ownedChoirs.length > 1 ? 's' : ''} créée{ownedChoirs.length > 1 ? 's' : ''} :
                    </p>
                    {ownedChoirs.map((c) => (
                      <p key={c.id} style={{ margin: '0.1rem 0 0.1rem 1.5rem', fontSize: '0.9rem' }}>
                        • {c.name}
                      </p>
                    ))}
                  </div>
                )}

                {/* Quota restant — non-admins uniquement */}
                {!user.isAdmin && (() => {
                  const nbRestant = user.choirs_nb - ownedChoirs.length;
                  if (user.choirs_nb === 0) return (
                    <p style={{ margin: '0.3rem 0', fontSize: '0.9rem', color: '#888' }}>
                      <i className="fa fa-circle-xmark" style={{ marginRight: '0.5rem' }}></i>
                      Aucun droit de créer une chorale
                    </p>
                  );
                  if (nbRestant <= 0) return (
                    <p style={{ margin: '0.3rem 0', fontSize: '0.9rem', color: '#888' }}>
                      <i className="fa fa-circle-xmark" style={{ marginRight: '0.5rem' }}></i>
                      Quota de chorales atteint
                    </p>
                  );
                  return (
                    <p style={{ margin: '0.3rem 0', fontSize: '0.9rem', color: '#044C8D' }}>
                      <i className="fa fa-circle-plus" style={{ marginRight: '0.5rem' }}></i>
                      Peut encore créer {nbRestant} chorale{nbRestant > 1 ? 's' : ''}
                    </p>
                  );
                })()}

                {/* Chorales déléguées */}
                {delegatedChoirs.length > 0 && (
                  <div style={{ margin: '0.5rem 0' }}>
                    <p style={{ margin: '0.2rem 0', fontWeight: 'bold' }}>
                      <i className="fa fa-handshake" style={{ color: '#044C8D', marginRight: '0.5rem' }}></i>
                      Délégation{delegatedChoirs.length > 1 ? 's' : ''} :
                    </p>
                    {delegatedChoirs.map((c) => (
                      <p key={c.id} style={{ margin: '0.1rem 0 0.1rem 1.5rem', fontSize: '0.9rem' }}>
                        • {c.name}
                      </p>
                    ))}
                  </div>
                )}

              </div>

              {justLoggedIn && (
                <p style={{ color: '#044C8D', fontSize: '0.9rem', margin: '2.9rem 0 0.5rem 0' }}>
                  Redirection vers l'accueil dans quelques secondes...
                </p>
              )} 

              {/* Bouton Se déconnecter — masqué si on vient de se connecter */}
              {!justLoggedIn && (
                <button type="button" className="page-button"
                  disabled={showOfflineBanner || showTimeoutBanner}
                  style={{ opacity: showOfflineBanner || showTimeoutBanner ? 0.5 : 1 }}
                  onClick={handleLogout}
                >
                  Se déconnecter
                </button>
              )}
            </>
          ) : (
            <>
              {/* Formulaire de connexion */}
              <h2>Connexion</h2>
              <form onSubmit={handleSubmit}>
                <input type="text" placeholder="Email ou login" autoComplete="username" value={email}
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