import { useState, useEffect } from 'react';
import { supabase } from '../../infrastructure/storage/supabaseClient';
import '../../App.css';

export default function ResetPasswordPage() {
  const [email] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // récupérer l'email depuis l'URL si Supabase le fournit
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('access_token'); 
    if (!token) {
      setMessage('Token manquant dans l’URL ! Impossible de réinitialiser le mot de passe.');
    }
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
      <p>Email : {email}</p>
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
      {message && <p>{message}</p>}
    </div>
  );
}