import { useState, useEffect } from 'react';
import { supabase } from '../../infrastructure/storage/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { login, signOut } from '../../infrastructure/storage/authService';
import { translateSupabaseError } from '../../infrastructure/storage/translateSupabaseError';
import '../../App.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState<{ email: string; isAdmin: boolean } | null>(null);

  const navigate = useNavigate();

  // Vérifie si l'utilisateur est déjà connecté
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUser({ email: data.user.email!, isAdmin: false });
      }
    };
    getUser();
  }, []);

  // A la validation du formulaire de login
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const result = await login(email, password);
      setMessage(result.message);      

      // Redirections
      if (result.isNewUser) {
        navigate('/reset-request'); 
      } else {
        setUser({ email: result.email!, isAdmin: result.isAdmin });
        navigate('/my-choirs'); 
      }
    } catch (err: any) {
      setMessage(translateSupabaseError(err.message));
    } finally {
      setLoading(false);
    }
  };

  // Fonction de log Out
  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="page-container">
      <Link to="/" className="navigation">←</Link>

      {user ? (
        <>
          <h2>Déconnexion</h2>
          <p>Utilisateur connecté : {user.email}</p>
          <button type="button" className="page-button" onClick={handleLogout}>
            Se déconnecter
          </button>
        </>
              
      ) : (
        <>
          <h2>Connexion</h2>
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
            <button type="submit" className="page-button" disabled={loading}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <button
            type="button"
            className="page-button2"
            style={{ marginTop: '0.5rem' }}
            onClick={() => navigate('/reset-request')}
          >
            Réinitialiser le mot de passe
          </button>
        </>
      )}

      {message && <p style={{ color: 'red' }}>{message}</p>}
    </div>
  );
}