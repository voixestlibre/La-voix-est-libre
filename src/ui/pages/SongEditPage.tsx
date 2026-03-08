import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getCurrentUser } from '../../infrastructure/storage/authService';
import { getChoirOwner } from '../../infrastructure/storage/choirsService';
import {
  getSong,
  createSong,
  updateSong,
  getChoirHashtags,
} from '../../infrastructure/storage/songsService';
import '../../App.css';

export default function SongEditPage() {
  // choirId présent → mode création, songId présent → mode modification
  const { choirId, songId } = useParams();
  const isEditing = !!songId;
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [allHashtags, setAllHashtags] = useState<string[]>([]);
  const [resolvedChoirId, setResolvedChoirId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // URL de retour : page du chant en mode édition, page de la chorale en mode création
  const backUrl = isEditing ? `/song/${songId}` : `/choir/${resolvedChoirId}`;

  useEffect(() => {
    const init = async () => {
      // Vérifier que l'utilisateur est connecté
      const currentUser = await getCurrentUser();
      if (!currentUser) { navigate('/'); return; }

      if (isEditing) {
        // Mode modification : charger le chant existant
        try {
          const data = await getSong(songId!);
          setTitle(data.title);
          setHashtags(data.hashtags);
          setResolvedChoirId(data.choir_id);

          // Vérifier que l'utilisateur est bien propriétaire de la chorale
          const ownerId = await getChoirOwner(data.choir_id);
          if (ownerId !== currentUser.id) { navigate('/'); return; }

          // Charger tous les hashtags connus de la chorale pour l'autocomplétion
          const known = await getChoirHashtags(data.choir_id);
          setAllHashtags(known);
        } catch (err: any) {
          console.log('Erreur init SongEditPage:', err);
          navigate('/');
        }
      } else {
        // Mode création : vérifier que l'utilisateur est propriétaire de la chorale
        const ownerId = await getChoirOwner(choirId!);
        if (ownerId !== currentUser.id) { navigate('/'); return; }
        setResolvedChoirId(choirId!);

        // Charger tous les hashtags connus de la chorale pour l'autocomplétion
        const known = await getChoirHashtags(choirId!);
        setAllHashtags(known);
      }
    };
    init();
  }, [choirId, songId, navigate, isEditing]);

  // Mettre à jour les suggestions quand l'utilisateur tape
  const handleHashtagInput = (value: string) => {
    setHashtagInput(value);
    if (value.trim().length === 0) {
      setSuggestions([]);
      return;
    }
    const search = value.toLowerCase();
    // Filtrer les hashtags connus qui correspondent à la saisie et ne sont pas déjà sélectionnés
    setSuggestions(
      allHashtags.filter(
        (h) => h.toLowerCase().includes(search) && !hashtags.includes(h)
      )
    );
  };

  // Ajouter un hashtag (depuis la saisie libre ou depuis une suggestion)
  const addHashtag = (value: string) => {
    const clean = value.trim().replace(/^#+/, '');
    if (!clean) return;
    
    // Supprimer les accents et mettre la première lettre en majuscule
    const noAccent = clean.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const capitalized = noAccent.charAt(0).toUpperCase() + noAccent.slice(1);
    
    const tag = `#${capitalized}`;
    if (!hashtags.includes(tag)) {
      setHashtags([...hashtags, tag]);
    }
    setHashtagInput('');
    setSuggestions([]);
  };

  // Valider la saisie d'un hashtag avec Entrée ou Espace
  const handleHashtagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      addHashtag(hashtagInput);
    }
  };

  // Supprimer un hashtag de la sélection
  const removeHashtag = (tag: string) => {
    setHashtags(hashtags.filter((h) => h !== tag));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Si un hashtag est en cours de saisie, l'ajouter avant de soumettre
    if (hashtagInput.trim().length > 0) {
      addHashtag(hashtagInput);
      return;
    }    
    
    setLoading(true);
    setMessage('');
    try {
      if (isEditing) {
        // Mettre à jour le chant existant
        await updateSong(songId!, title, hashtags);
        navigate(`/song/${songId}`);
      } else {
        // Créer le chant et rediriger vers sa page
        const data = await createSong(resolvedChoirId, title, hashtags);
        navigate(`/song/${data.id}`);
      }
    } catch (err: any) {
      setMessage(`Erreur : ${err.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="page-container">
      <div className="top-bar">
        <Link to={backUrl} className="navigation">
          <i className="fa fa-chevron-left"></i>
        </Link>
        <Link to="/login" className="navigation">
          <i className="fa fa-right-from-bracket"></i>
        </Link>        
      </div>

      <h2>{isEditing ? 'Modifier un chant' : 'Ajouter un chant'}</h2>

      <form onSubmit={handleSubmit}>
        {/* Titre du chant */}
        <input
          type="text"
          placeholder="Titre du chant"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="page-form-input"
        />

        {/* Saisie des hashtags avec autocomplétion */}
        <div style={{ position: 'relative', margin: '0.5rem 0' }}>
          <input
            type="text"
            placeholder="Ajouter un hashtag"
            value={hashtagInput}
            onChange={(e) => handleHashtagInput(e.target.value)}
            onKeyDown={handleHashtagKeyDown}
            className="page-form-input"
            style={{ width: '200px' }}
          />

          {/* Liste de suggestions d'autocomplétion */}
          {suggestions.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0,
              backgroundColor: 'white', borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              overflow: 'hidden', minWidth: '200px', zIndex: 100,
            }}>
              {suggestions.map((s) => (
                <div
                  key={s}
                  onClick={() => addHashtag(s)}
                  style={{
                    padding: '0.5rem 1rem', fontSize: '0.9rem',
                    cursor: 'pointer', color: '#222',
                    borderBottom: '1px solid #eee',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#E6F2FF')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
                >
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hashtags sélectionnés affichés sous forme de pills */}
        {hashtags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', margin: '0.5rem 0 1rem 0' }}>
            {hashtags.map((tag) => (
              <span key={tag} className="hashtag-pill">
                {tag}
                {/* Croix pour supprimer le hashtag */}
                <span className="hashtag-remove" onClick={() => removeHashtag(tag)}>×</span>
              </span>
            ))}
          </div>
        )}

        <div style={{ marginBottom: '0.5rem' }}>
          <button className="page-button" type="submit" disabled={loading}>
            {loading ? 'Enregistrement...' : isEditing ? 'Modifier' : 'Créer'}
          </button>
        </div>

        {/* Bouton annuler → retour à la page du chant ou de la chorale */}
        <div>
          <button
            type="button"
            className="page-button2"
            onClick={() => navigate(backUrl)}
          >
            Annuler
          </button>
        </div>
      </form>

      {message && <p style={{ color: 'red' }}>{message}</p>}
    </div>
  );
}