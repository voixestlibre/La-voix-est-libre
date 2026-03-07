import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getCurrentUser } from '../../infrastructure/storage/authService';
import { getChoirByCode } from '../../infrastructure/storage/choirsService';
import '../../App.css';

export default function ChoirJoinPage() {
  const [groups, setGroups] = useState<string[]>(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();

  // Vérifier si l'utilisateur est connecté au chargement
  useEffect(() => {
    getCurrentUser().then((currentUser) => {
      if (currentUser) setUser(currentUser);
    });
  }, []);

  // Gestion de la saisie : chiffres uniquement, passage auto au groupe suivant
  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newGroups = [...groups];
    newGroups[index] = value.slice(0, 2);
    setGroups(newGroups);
    if (value.length === 2 && index < 3) inputs.current[index + 1]?.focus();
  };

  // Retour au groupe précédent si Backspace sur un groupe vide
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !groups[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  // Recherche de la chorale par son code et redirection
  const handleJoin = async () => {
    const code = groups.join('');
    if (code.length < 8) {
      setError('Veuillez saisir le code complet...');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const data = await getChoirByCode(code);

      // Stocker la chorale dans le localStorage si pas déjà présente
      const existing = JSON.parse(localStorage.getItem('joined_choirs') || '[]');
      if (!existing.find((c: any) => c.code === data.code)) {
        existing.push({ code: data.code, name: data.name });
        localStorage.setItem('joined_choirs', JSON.stringify(existing));
      }

      navigate(`/choir/${data.id}`);
    } catch {
      setError('Code invalide...');
    }

    setLoading(false);
  };

  return (
    <div className="page-container">
      <div className="top-bar">
        <Link to="/my-choirs" className="navigation">←</Link>
        {user && <Link to="/login" className="navigation">⎋</Link>}
      </div>

      <h2>Rejoindre une chorale</h2>
      <p>Renseignez le code de la chorale que vous souhaitez rejoindre :</p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '1.5rem 0' }}>
        {groups.map((g, index) => (
          <React.Fragment key={index}>
            <input
              ref={(el) => { inputs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={g}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              style={{
                width: '3rem', height: '2.5rem',
                textAlign: 'center', fontSize: '1.2rem',
                border: '2px solid #044C8D', borderRadius: '6px',
              }}
            />
            {index < 3 && <span style={{ fontSize: '1.4rem', color: '#044C8D' }}>-</span>}
          </React.Fragment>
        ))}
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ margin: '0.5rem 0' }}>
        <button className="page-button" onClick={handleJoin} disabled={loading}>
          {loading ? 'Recherche...' : 'Rejoindre'}
        </button>
      </div>
      <div>
        <button className="page-button2" onClick={() => navigate('/my-choirs')}>
          Annuler
        </button>
      </div>
    </div>
  );
}