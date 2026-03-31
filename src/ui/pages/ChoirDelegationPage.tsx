import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCurrentUser, createDelegateAccount, getChoirDelegates, revokeDelegation } from '../../infrastructure/storage/authService';
import { getChoirOwner } from '../../infrastructure/storage/choirsService';
import '../../App.css';
import TopBar from '../components/TopBar';
import { type UserProfile } from '../components/helpData';

export default function ChoirDelegationPage() {
  const { choirId } = useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [delegates, setDelegates] = useState<string[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [helpProfiles] = useState<UserProfile[]>(['owner']);

  useEffect(() => {
    const init = async () => {
      const currentUser = await getCurrentUser();
      if (!currentUser) { navigate('/'); return; }

      const ownerId = await getChoirOwner(choirId!);
      if (ownerId !== currentUser.id) { navigate('/'); return; }

      const list = await getChoirDelegates(choirId!);
      setDelegates(list);
      setPageLoading(false);
    };
    init();
  }, [choirId, navigate]);

  const handleRevoke = async (delegateEmail: string) => {
    if (!window.confirm(`Révoquer la délégation de ${delegateEmail} ?`)) return;
    setLoading(true);
    try {
      await revokeDelegation(delegateEmail, choirId!);
      // Mettre à jour la liste localement sans recharger
      setDelegates((prev) => prev.filter((d) => d !== delegateEmail));
    } catch (err: any) {
      setMessage(`Erreur : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

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
  
      // createDelegateAccount crée le compte si inexistant, puis ajoute la délégation dans users_param.choirs_delegations
      // Le mot de passe n'est utilisé que si le compte est nouveau — si le compte existe déjà, il est ignoré
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
      <TopBar helpPage="choir-delegation" helpProfiles={helpProfiles} />
      <h2>Donner délégation</h2>

      {pageLoading || loading ? <div className="spinner"></div> : (
        <>
          {/* Liste des délégués existants */}
          {delegates.length > 0 && (
            <>
              <p style={{ color: '#044C8D', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>
                Utilisateurs ayant reçu délégation :
              </p>
              <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1.5rem' }}>
                {delegates.map((d) => (
                  <li key={d} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid #E6F2FF' }}>
                    <span style={{ color: '#333' }}>
                      <i className="fa fa-user" style={{ color: '#044C8D', marginRight: '0.5rem' }}></i>
                      {d}
                    </span>
                    {/* Icône de révocation */}
                    <i
                      className="fa fa-trash trash"                    
                      style={{ color: '#FB8917', marginLeft: '0.5rem' }}
                      onClick={() => handleRevoke(d)}
                    />
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
        </>
      )}          
    </div>
  );
}