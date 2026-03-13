import { useState, useEffect } from 'react';
import { getCurrentUser, requestPasswordReset } from '../../infrastructure/storage/authService';
import '../../App.css';
import TopBar from '../components/TopBar';

export default function RequestResetPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      await getCurrentUser();
      setPageLoading(false);
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
      <TopBar />
      <h2>Réinitialiser le mot de passe</h2>

      {pageLoading || loading ? <div className="spinner"></div> : (
        <>
          {!message && (
            <form onSubmit={handleSubmit}>
              <input type="email" placeholder="Votre email" value={email}
                onChange={(e) => setEmail(e.target.value)} required className="page-form-input" />
              <button type="submit" className="page-button">
                Réinitialiser
              </button>
            </form>
          )}
          {message && <p>{message}</p>}
        </>
      )}
    </div>
  );
}