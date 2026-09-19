import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isCurrentUserAdmin, createUserAccount, listUsers, 
  toggleAdmin, apiUpdateChoirsNb, updateUserLogin } from '../../infrastructure/storage/authService';
import '../../App.css';
import TopBar from '../components/TopBar';
import { type UserProfile } from '../components/helpData';

export default function UserCreatePage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [helpProfiles] = useState<UserProfile[]>(['admin']);
  const [users, setUsers] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);  

  useEffect(() => {
    const init = async () => {
      // Vérifier que l'utilisateur connecté est bien admin
      const admin = await isCurrentUserAdmin();
      if (!admin) {
        navigate('/');
        return;
      }
      // Récupérer l'id de l'utilisateur connecté
      const { getCurrentUser } = await import('../../infrastructure/storage/authService');
      const currentUser = await getCurrentUser();
      setCurrentUserId(currentUser?.id ?? null);      
      // Charger la liste des utilisateurs
      const list = await listUsers();
      setUsers(list);   

      setPageLoading(false);
    };
    init();
  }, [navigate]);

  // createUserAccount crée le compte avec le mot de passe saisi par l'admin.
  // L'utilisateur pourra le modifier via "Réinitialiser le mot de passe" depuis la page de connexion.
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await createUserAccount(email, password);
      setSuccess(true);
      setMessage('Compte créé avec succès.');
      const list = await listUsers();
      setUsers(list);      
    } catch (err: any) {
      setMessage(`Erreur : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <TopBar helpPage="create-user" helpProfiles={helpProfiles} />
      <h2>Créer un utilisateur</h2>

      {pageLoading ? <div className="spinner"></div> : (
        <>
          {!success ? (
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
              <div style={{ marginTop: '1rem' }}>
                <button type="submit" className="page-button" disabled={loading}>
                  {loading ? 'Création...' : 'Valider'}
                </button>
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <button type="button" className="page-button2" onClick={() => navigate('/')}>
                  Annuler
                </button>
              </div>
              {message && <p style={{ color: 'red', marginTop: '0.5rem' }}>{message}</p>}
            </form>
          ) : (
            <>
              <p style={{ color: 'green' }}>{message}</p>
              {/* Proposer de créer un autre utilisateur ou de retourner à l'accueil */}
              <button
                className="page-button"
                onClick={() => { setSuccess(false); setEmail(''); setPassword(''); setMessage(''); }}
              >
                Créer un autre utilisateur
              </button>
              <div style={{ marginTop: '0.5rem' }}>
                <button className="page-button2" onClick={() => navigate('/')}>
                  Retour à l'accueil
                </button>
              </div>
            </>
          )}

          {/* Liste des utilisateurs */}
          {users.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <p style={{ color: '#044C8D', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                Utilisateurs enregistrés :
              </p>
              {users.map((u) => (
                <div key={u.id} style={{
                  padding: '0.6rem 0',
                  borderBottom: '1px solid #E6F2FF',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.2rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 'bold', color: '#222' }}>
                      <i className="fa fa-user" style={{ color: '#044C8D', marginRight: '0.5rem' }}></i>
                      {u.email}
                    </span>
                    {/* Toggle admin — désactivé pour l'utilisateur connecté */}
                    <button
                      type="button"
                      className={u.is_admin ? 'page-button' : 'page-button2'}
                      style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem',
                        opacity: Number(u.id) === Number(currentUserId) ? 0.4 : 1 }}
                      disabled={Number(u.id) === Number(currentUserId)}
                      onClick={async () => {
                        await toggleAdmin(u.id, !u.is_admin);
                        setUsers((prev) => prev.map((x) =>
                          x.id === u.id ? { ...x, is_admin: !u.is_admin } : x
                        ));
                      }}
                    >
                      {u.is_admin ? 'Admin ✓' : 'Admin'}
                    </button>
                  </div>

{/* Login éditable */}
<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem' }}>
  <i className="fa fa-at" style={{ color: '#044C8D', width: '1rem' }}></i>
  <input
    type="text"
    placeholder="Login (optionnel)"
    defaultValue={u.login ?? ''}
    onBlur={async (e) => {
      const newLogin = e.target.value.trim();
      if (newLogin === (u.login ?? '')) return; // pas de changement
      try {
        await updateUserLogin(u.id, newLogin);
        setUsers((prev) => prev.map((x) =>
          x.id === u.id ? { ...x, login: newLogin || null } : x
        ));
      } catch (err: any) {
        alert(err.message || 'Erreur lors de la mise à jour du login');
        e.target.value = u.login ?? '';
      }
    }}
    style={{
      border: '1px solid #ccc', borderRadius: '6px',
      padding: '0.2rem 0.4rem', fontSize: '0.82rem',
      width: '140px',
    }}
  />
</div>

                  {u.owned_choirs && (
                    <span style={{ fontSize: '0.82rem', color: '#555' }}>
                      <i className="fa fa-music" style={{ marginRight: '0.4rem', color: '#DA486D' }}></i>
                      Propriétaire : {u.owned_choirs}
                    </span>
                  )}
                  {u.delegated_choirs?.length > 0 && (
                    <span style={{ fontSize: '0.82rem', color: '#555' }}>
                      <i className="fa fa-handshake" style={{ marginRight: '0.4rem', color: '#044C8D' }}></i>
                      Délégué : {u.delegated_choirs.join(', ')}
                    </span>
                  )}

                  {/* Quota de chorales — affiché uniquement pour les non-admins */}
                  {!u.is_admin && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#555' }}>
                      <i className="fa fa-plus-circle" style={{ color: '#044C8D', marginRight: '0.2rem' }}></i>
                      Chorales autorisées :
                      <button
                        type="button"
                        onClick={async () => {
                          if (u.choirs_nb <= 0) return;
                          await apiUpdateChoirsNb(u.id, u.choirs_nb - 1);
                          setUsers((prev) => prev.map((x) =>
                            x.id === u.id ? { ...x, choirs_nb: u.choirs_nb - 1 } : x
                          ));
                        }}
                        disabled={u.choirs_nb <= 0}
                        style={{ border: 'none', background: 'none', cursor: u.choirs_nb <= 0 ? 'default' : 'pointer',
                          color: u.choirs_nb <= 0 ? '#ccc' : '#044C8D', fontSize: '1rem', padding: '0 0.2rem' }}
                      >
                        <i className="fa fa-chevron-down"></i>
                      </button>
                      <span style={{ fontWeight: 'bold', minWidth: '1.2rem', textAlign: 'center' }}>
                        {u.choirs_nb}
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          await apiUpdateChoirsNb(u.id, u.choirs_nb + 1);
                          setUsers((prev) => prev.map((x) =>
                            x.id === u.id ? { ...x, choirs_nb: u.choirs_nb + 1 } : x
                          ));
                        }}
                        style={{ border: 'none', background: 'none', cursor: 'pointer',
                          color: '#044C8D', fontSize: '1rem', padding: '0 0.2rem' }}
                      >
                        <i className="fa fa-chevron-up"></i>
                      </button>
                    </div>
                  )}

                </div>
              ))}
            </div>
)}

        </>
      )}
    </div>
  );
}