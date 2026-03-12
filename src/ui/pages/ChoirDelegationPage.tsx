import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getCurrentUser, createDelegateAccount, getChoirDelegates } from '../../infrastructure/storage/authService';
import { getChoirOwner } from '../../infrastructure/storage/choirsService';
import '../../App.css';

export default function ChoirDelegationPage() {
  const { choirId } = useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [delegates, setDelegates] = useState<string[]>([]);

  useEffect(() => {
    const init = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser) { navigate('/'); return; }

      const ownerId = await getChoirOwner(choirId!);
      if (ownerId !== currentUser.id) { navigate('/'); return; }

      const list = await getChoirDelegates(choirId!);
      setDelegates(list);
    };
    init();
  }, [choirId, navigate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
  
    try {
      // Vérifier que l'email n'est pas celui du propriétaire
      const currentUser = await getCurrentUser();
      if (currentUser?.email?.toLowerCase() === email.toLowerCase()) {
        setMessage("L'email renseigné est celui du propriétaire de la chorale.");
        setLoading(false);
        return;
      }
  
      const result = await createDelegateAccount(email, password, choirId!);
      setMessage(result.isNewUser
        ? 'Compte créé avec succès. La délégation a été accordée.'
        : 'Compte existant. La délégation a été accordée.');
      setSuccess(true);
      const list = await getChoirDelegates(choirId!);
      setDelegates(list);
    } catch (err: any) {
      setMessage(`Erreur : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="top-bar">
        <Link to={`/choir/${choirId}`} className="navigation">
          <i className="fa fa-chevron-left"></i>
        </Link>
      </div>

      <h2>Donner délégation</h2>

      {/* Liste des délégués existants */}
      {delegates.length > 0 && (
        <>
          <p style={{ color: '#044C8D', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>
            Utilisateurs ayant reçu délégation :
          </p>
          <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1.5rem' }}>
            {delegates.map((d) => (
              <li key={d} style={{ padding: '0.4rem 0', borderBottom: '1px solid #E6F2FF', color: '#333' }}>
                <i className="fa fa-user" style={{ color: '#044C8D', marginRight: '0.5rem' }}></i>
                {d}
              </li>
            ))}
          </ul>
        </>
      )}

      {!success ? (
        <form onSubmit={handleSubmit}>
          <input type="email" placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)} required className="page-form-input" />
          <input type="password" placeholder="Mot de passe" value={password}
            onChange={(e) => setPassword(e.target.value)} required className="page-form-input" />
          <div style={{ marginTop: '1rem' }}>
            <button type="submit" className="page-button" disabled={loading}>
              {loading ? 'Validation...' : 'Valider'}
            </button>
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <button type="button" className="page-button2"
              onClick={() => navigate(`/choir/${choirId}`)}>
              Annuler
            </button>
          </div>
        </form>
      ) : (
        <>
          <p style={{ color: 'green' }}>{message}</p>
          <button className="page-button" onClick={() => { setSuccess(false); setEmail(''); setPassword(''); setMessage(''); }}>
            Créer une autre délégation
          </button>
          <div style={{ marginTop: '0.5rem' }}>
            <button className="page-button2" onClick={() => navigate(`/choir/${choirId}`)}>
              Retour à la chorale
            </button>
          </div>
        </>
      )}

      {!success && message && <p style={{ color: 'red' }}>{message}</p>}
    </div>
  );
}