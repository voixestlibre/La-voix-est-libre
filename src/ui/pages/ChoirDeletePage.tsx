import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getCurrentUser } from '../../infrastructure/storage/authService';
import { getChoir, deleteChoirCascade } from '../../infrastructure/storage/choirsService';
import { countChoirSongs } from '../../infrastructure/storage/songsService';
import { removeStoredChoir, removeStoredEventsByChoirId } from '../../infrastructure/storage/localStorageService';
import '../../App.css';

export default function DeleteChoirPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [choirName, setChoirName] = useState('');
  const [songsCount, setSongsCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchChoir = async () => {
      // Vérifier que l'utilisateur est connecté
      const currentUser = await getCurrentUser();
      if (!currentUser) { navigate('/'); return; }

      // Récupérer la chorale et vérifier qu'elle appartient à l'utilisateur
      try {
        const data = await getChoir(id!);
        if (data.owner_id !== currentUser.id) { navigate('/'); return; }
        setChoirName(data.name);

        // Compter les chants rattachés à la chorale
        const count = await countChoirSongs(id!);
        setSongsCount(count);
      } catch {
        navigate('/');
      }
    };
    fetchChoir();
  }, [id, navigate]);

  const handleDelete = async () => {
    setLoading(true);
    try {
      // deleteChoirCascade supprime tout : fichiers bucket, event_songs, events, songs, choir
      await deleteChoirCascade(id!);
  
      // Nettoyer le localStorage
      removeStoredChoir(id!);
      removeStoredEventsByChoirId(id!);
  
      navigate('/my-choirs');
    } catch (err: any) {
      setMessage(`Erreur lors de la suppression : ${err.message}`);
    }
    setLoading(false);
  };

  // Message de confirmation selon le nombre de chants
  const confirmMessage = songsCount === 0
    ? <>Êtes-vous sûr de vouloir supprimer la chorale <strong>{choirName}</strong> ?</>
    : songsCount === 1
    ? <>Êtes-vous sûr de vouloir supprimer la chorale <strong>{choirName}</strong> (ainsi que <strong>le chant</strong> qui lui est rattaché) ?</>
    : <>Êtes-vous sûr de vouloir supprimer la chorale <strong>{choirName}</strong> (ainsi que <strong>les {songsCount} chants</strong> qui lui sont rattachés) ?</>;

  return (
    <div className="page-container">
      <div className="top-bar">
        <Link to="/my-choirs" className="navigation">
          <i className="fa fa-chevron-left"></i>
        </Link>
        <Link to="/login" className="navigation">
          <i className="fa fa-right-from-bracket"></i>
        </Link>
      </div>
      <h2>Supprimer une chorale</h2>
      <p>{confirmMessage}</p>
      <div style={{ margin: '0.5rem 0' }}>
        <button className="page-button" onClick={handleDelete} disabled={loading}>
          {loading ? 'Suppression...' : 'Confirmer'}
        </button>
      </div>
      <div>
        <button className="page-button2" onClick={() => navigate('/my-choirs')}>
          Annuler
        </button>
      </div>
      {message && <p style={{ color: 'red' }}>{message}</p>}
    </div>
  );
}