import AccueilIcon from '../../assets/accueil.png';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../infrastructure/storage/supabaseClient';
import '../../App.css';

export default function RequestResetPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const redirectUrl = 'https://lavoixestlibre.netlify.app/reset-password' ;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl, 
    });

    if (error) {
      setMessage('Erreur lors de la demande de réinitialisation.');
      console.error(error);
    } else {
      setMessage(
        'Si cet email est connu, vous allez recevoir un email avec un lien pour réinitialiser votre mot de passe.'
      );
    }

    setLoading(false);
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

      <h2>RéinitialiserR le mot de passe</h2>
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