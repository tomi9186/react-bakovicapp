import React, { useEffect, useMemo, useState } from 'react';
import {
  Block,
  Link,
  List,
  ListInput,
  ListItem,
  Navbar,
  NavLeft,
  NavTitle,
  Page,
} from 'framework7-react';
import { useAuth } from '../context/AuthContext';
import { fetchAlati, fetchGradilista } from '../services/api';

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

  if (isCheckingAuth || !isAuthenticated) {
    return null;
  }

  return (
    <Page>
      <Navbar>
        <NavLeft>
          <Link back iconF7="chevron_left" />
        </NavLeft>
        <NavTitle>{gradiliste?.naziv || 'Detalj gradilišta'}</NavTitle>
      </Navbar>

      {loading ? (
        <Block strong className="empty-state">
          Učitavanje detalja...
        </Block>
      ) : (
        <>
          <Block strong>
            <div>
              <strong>Naziv:</strong> {gradiliste?.naziv || 'Nepoznato'}
            </div>
            <div>
              <strong>ID:</strong> {gradiliste?.id || '-'}
            </div>
            <div>
              <strong>Slug:</strong> {gradiliste?.slug || '-'}
            </div>
          </Block>
          <List inset>
            <ListInput
              type="select"
              label="Filter kategorije"
              value={filterKategorija}
              onChange={(event) => setFilterKategorija(event.target.value)}
            >
              <option value="sve">Sve kategorije</option>
              {kategorije.map((kategorija) => (
                <option key={kategorija} value={kategorija}>
                  {kategorija}
                </option>
              ))}
            </ListInput>
          </List>
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