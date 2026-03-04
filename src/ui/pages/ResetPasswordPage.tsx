import { useState, useEffect } from 'react';
import { supabase } from '../../infrastructure/storage/supabaseClient';
import '../../App.css';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken) {
      setMessage("Lien invalide ou expiré. Veuillez refaire une demande de réinitialisation.");
      return;
    }

    supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || '',
    }).then(({ error }) => {
      if (error) {
        setMessage("Session invalide. Veuillez refaire une demande de réinitialisation.");
      } else {
        setReady(true);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage(`Erreur : ${error.message}`);
    } else {
      setMessage('Mot de passe réinitialisé avec succès ! Vous pouvez maintenant vous connecter.');
      setPassword('');
    }

    setLoading(false);
  };

  return (
    <div className="page-container">
      <h2>Réinitialisation du mot de passe</h2>
      {ready && (
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Nouveau mot de passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="page-form-input"
          />
          <button type="submit" className="page-button" disabled={loading}>
            {loading ? 'Réinitialisation...' : 'Valider'}
          </button>
        </form>
      )}
      {message && <p>{message}</p>}
    </div>
  );
}