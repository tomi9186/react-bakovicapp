import React, { useEffect, useMemo, useState } from 'react';
import {
  Block,
  List,
  ListItem,
  Navbar,
  NavLeft,
  NavRight,
  NavTitle,
  Page,
} from 'framework7-react';
import { useAuth } from '../context/AuthContext';
import { fetchAlati, fetchGradilista, deleteGradiliste, updateAlat } from '../services/api';

function GradilisteDetailPage({ f7route, f7router }) {
  const { isAuthenticated, isCheckingAuth } = useAuth();
  const [gradiliste, setGradiliste] = useState(null);
  const [alati, setAlati] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterKategorija, setFilterKategorija] = useState('sve');
  const id = String(f7route.params.id);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [svaGradilista, sviAlati] = await Promise.all([
          fetchGradilista(),
          fetchAlati(),
        ]);
        setGradiliste(svaGradilista.find((item) => String(item.id) === id) || null);
        setAlati(sviAlati);
      } catch (error) {
        // eslint-disable-next-line no-alert
        alert('Greška pri učitavanju detalja gradilišta.');
      } finally {
        setLoading(false);
      }
    };

    if (!isCheckingAuth && !isAuthenticated) {
      f7router.navigate('/login/');
      return;
    }
    if (isCheckingAuth) return;

    loadData();
  }, [id, isAuthenticated, isCheckingAuth, f7router]);

  const alatiNaGradilistu = useMemo(
    () => alati.filter((alat) => String(alat.gradilisteId) === id),
    [alati, id]
  );

  const kategorije = useMemo(
    () =>
      Array.from(
        new Set(alatiNaGradilistu.map((item) => (item.kategorija || '').trim()).filter(Boolean))
      ),
    [alatiNaGradilistu]
  );

  const filtriraniAlati = useMemo(
    () =>
      filterKategorija === 'sve'
        ? alatiNaGradilistu
        : alatiNaGradilistu.filter((item) => (item.kategorija || '') === filterKategorija),
    [alatiNaGradilistu, filterKategorija]
  );

  const onDelete = async () => {
    if (!window.confirm('Želite li obrisati gradilište?')) return;
    try {
      // Prvo dohvati sve alate
      const sviAlati = await fetchAlati();
      
      // Pronađi sve alate na ovom gradilištu
      const alatiNaGradilistu = sviAlati.filter((alat) => String(alat.gradilisteId) === id);
      
      // Vrati sve alate u glavno skladište
      for (const alat of alatiNaGradilistu) {
        await updateAlat(alat.id, {
          title: alat.naziv,
          status: 'publish',
          meta: {
            kategorija: alat.kategorija,
            broj_komada: alat.brojKomada,
            gradiliste_id: 0,
          },
        });
      }
      
      // Tek nakon što su svi alati vraćeni, obriši gradilište
      await deleteGradiliste(id);
      
      // Navigiraj natrag
      if (window.history.length > 1) {
        f7router.back();
      } else {
        f7router.navigate('/gradilista/');
      }
    } catch (error) {
      // eslint-disable-next-line no-alert
      alert('Greška pri brisanju gradilišta.');
    }
  };

  if (isCheckingAuth || !isAuthenticated) {
    return null;
  }

  return (
    <Page>
      <Navbar>
        <NavLeft>
          <div
            onClick={() => {
              if (window.history.length > 1) {
                f7router.back();
              } else {
                f7router.navigate('/');
              }
            }}
            style={{ cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </div>
        </NavLeft>
        <NavTitle>{gradiliste?.naziv || 'Detalj gradilišta'}</NavTitle>
        <NavRight>
          <div
            onClick={onDelete}
            style={{ cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </div>
        </NavRight>
      </Navbar>

      {loading ? (
        <Block strong className="empty-state">
          Učitavanje detalja...
        </Block>
      ) : (
        <>
          <Block
            style={{
              padding: '12px 16px',
              marginBottom: 0,
              marginTop: '20px',
            }}
          >
            <label style={{ display: 'block', fontSize: '12px', color: '#999', marginBottom: 6 }}>
              Filter po kategoriji
            </label>
            <select
              value={filterKategorija}
              onChange={(event) => setFilterKategorija(event.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                fontSize: '14px',
                backgroundColor: 'white',
                cursor: 'pointer',
              }}
            >
              <option value="sve">Sve kategorije</option>
              {kategorije.map((kategorija) => (
                <option key={kategorija} value={kategorija}>
                  {kategorija}
                </option>
              ))}
            </select>
          </Block>

          <List strong inset>
            {filtriraniAlati.length === 0 ? (
              <ListItem title="Nema alata na ovom gradilištu." />
            ) : (
              filtriraniAlati.map((alat) => (
                <ListItem
                  key={alat.id}
                  title={alat.naziv}
                  footer={`Kategorija: ${alat.kategorija || 'N/A'} | Komada: ${
                    alat.brojKomada || 0
                  }`}
                />
              ))
            )}
          </List>
        </>
      )}
    </Page>
  );
}

export default GradilisteDetailPage;