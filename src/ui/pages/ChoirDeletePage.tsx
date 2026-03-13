import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCurrentUser } from '../../infrastructure/storage/authService';
import { getChoir, deleteChoirCascade } from '../../infrastructure/storage/choirsService';
import { countChoirSongs } from '../../infrastructure/storage/songsService';
import { removeStoredChoir, removeStoredEventsByChoirId } from '../../infrastructure/storage/localStorageService';
import '../../App.css';
import TopBar from '../components/TopBar';

export default function DeleteChoirPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [choirName, setChoirName] = useState('');
  const [songsCount, setSongsCount] = useState(0);
  const [pageLoading, setPageLoading] = useState(true);
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

        // Interdire la suppression de la chorale 20393827
        if (String(data.code) === '20398727') {
          setChoirName(data.name);
          setMessage('Cette chorale ne peut pas être supprimée.');
          setPageLoading(false); 
          return;
        }       

        setChoirName(data.name);

        // Compter les chants rattachés à la chorale
        const count = await countChoirSongs(id!);
        setSongsCount(count);
        setPageLoading(false);
      } catch {
        navigate('/my-choirs');
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
      <TopBar />
      <h2>Supprimer une chorale</h2>
      {pageLoading || loading ? <div className="spinner"></div> : (
        <>
          <p>{confirmMessage}</p>
          {!message && (
            <div style={{ margin: '0.5rem 0' }}>
              <button className="page-button" onClick={handleDelete}>
                Confirmer
              </button>
            </div>
          )}
          <div>
            <button className="page-button2" onClick={() => navigate(-1)}>
              Annuler
            </button>
          </div>
          {message && <p style={{ color: 'red' }}>{message}</p>}
        </>
      )}
    </div>
  );
}