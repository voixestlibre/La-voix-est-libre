import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../../App.css';
import type { FormEvent } from 'react';
import { createChoir } from '../../infrastructure/storage/choirsService';

export default function CreationPage() {
  const [email, setEmail] = useState('');
  const [choraleName, setChoraleName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      await createChoir(choraleName, email);
      setMessage('Chorale créée avec succès !');

      // Réinitialisation des champs (optionnel ici, puisque le formulaire disparaît)
      setChoraleName('');
      setEmail('');
    } catch (err: any) {
      setMessage(`Erreur : ${err.message}`);
    }

    setLoading(false);
  };

  return (
    <div className="page-container">
      <Link to="/" className="navigation"> ← </Link>
      <h2>Créer une nouvelle chorale</h2>

      {/* Affiche le formulaire seulement si aucun message de succès */}
      {!message && (
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
            type="text"
            placeholder="Nom de la chorale"
            value={choraleName}
            onChange={(e) => setChoraleName(e.target.value)}
            required
            className="page-form-input"
          />

          <button className="page-button" type="submit" disabled={loading}>
            {loading ? 'Création...' : 'Créer'}
          </button>
        </form>
      )}

      {/* Message de confirmation ou d'erreur */}
      {message && <p>{message}</p>}
    </div>
  );
}