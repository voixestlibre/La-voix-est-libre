import { useState } from 'react';
import { Link } from 'react-router-dom';
import AccueilIcon from '../../assets/accueil.png';
import { useNavigate } from 'react-router-dom';
import '../../App.css';

export default function CreationPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [choraleName, setChoraleName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: SubmitEvent & { currentTarget: HTMLFormElement }) => {
    e.preventDefault();

    console.log('Email:', email);
    console.log('Nom de la chorale:', choraleName);

    navigate('/chef', { state: { email, choraleName } });
  };

  return (
    <div className="page-container">
      {/* Image Accueil en haut à gauche */}
      <Link to="/">
        <img
          src={AccueilIcon}
          alt="Accueil"
          style={{ width: '90px', height: 'auto', cursor: 'pointer', marginBottom: '0.3rem' }}
        />
      </Link>

      <h2>Créer une nouvelle chorale</h2>

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

        <button className="page-button" type="submit">
          Créer
        </button>
      </form>
    </div>
  );
}