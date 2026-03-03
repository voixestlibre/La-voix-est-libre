import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signUp } from '../../infrastructure/storage/authService';
import { translateSupabaseError } from '../../infrastructure/storage/translateSupabaseError';
import '../../App.css';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [accountCreated, setAccountCreated] = useState(false); 
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await signUp(email, password);
      setMessage(
        <>
          <p>Compte créé !</p>
          <p>Un email de confirmation vous a été envoyé. Veuillez vérifier votre boîte mail avant de vous connecter.</p>
        </>
      );
      setAccountCreated(true);
    } catch (err: any) {
      setMessage(translateSupabaseError(err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <h2>Créer un compte</h2>
      {!accountCreated && (
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
            {loading ? 'Création...' : 'Créer un compte'}
          </button>
        </form>
      )}
      {message && <div>{message}</div>}
    </div>
  );
}