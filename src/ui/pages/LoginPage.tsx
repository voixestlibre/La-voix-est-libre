import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../../infrastructure/storage/authService';
import { translateSupabaseError } from '../../infrastructure/storage/translateSupabaseError';
import AccueilIcon from '../../assets/accueil.png';
import '../../App.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const result = await login(email, password);
      setMessage(result.message); 
      if (!result.isAdmin) {
        navigate('/'); 
      }
    } catch (err: any) {
      setMessage(translateSupabaseError(err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <Link to="/">
        <img
          src={AccueilIcon}
          alt="Accueil"
          style={{ width: '90px', height: 'auto', cursor: 'pointer', marginBottom: '0.3rem' }}
        />
      </Link>

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

        <button
          type="button" 
          className="page-button"
          style={{ marginTop: '0.5rem' }}
          onClick={() => navigate('/reset-request')} 
        >
          Réinitialiser le mot de passe
        </button>
        </form>
      {message && <p>{message}</p>}
    </div>
  );
}