import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getCurrentUser, requestPasswordReset } from '../../infrastructure/storage/authService';
import '../../App.css';

export default function RequestResetPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    };
    getUser();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
  
    try {
      await requestPasswordReset(email);
      setMessage('Si cet email est connu, vous allez recevoir un email avec un lien pour réinitialiser votre mot de passe.');
    } catch {
      setMessage('Erreur lors de la demande de réinitialisation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="top-bar">
        <Link to="/login" className="navigation">
          <i className="fa fa-chevron-left"></i>
        </Link>
        {user && <Link to="/login" className="navigation">
          <i className="fa fa-right-from-bracket"></i>
          </Link>}
      </div>
      <h2>Réinitialiser le mot de passe</h2>
      {!message && (
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Votre email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="page-form-input"
          />
          <button type="submit" className="page-button" disabled={loading}>
            {loading ? 'Envoi...' : 'Réinitialiser'}
          </button>
        </form>
      )}
      {message && <p>{message}</p>}
    </div>
  );
}