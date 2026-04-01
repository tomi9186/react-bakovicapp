import React, { useEffect, useState } from 'react';
import {
  Block,
  Button,
  Link,
  List,
  ListButton,
  ListInput,
  ListItem,
  Navbar,
  NavLeft,
  NavRight,
  NavTitle,
  Page,
} from 'framework7-react';
import { useAuth } from '../context/AuthContext';
import {
  createAlat,
  fetchAlati,
  fetchGradilista,
  transferAlatQuantity,
} from '../services/api';

function AlatiPage({ f7router }) {
  const { isAuthenticated, isCheckingAuth } = useAuth();
  const [alati, setAlati] = useState([]);
  const [gradilista, setGradilista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [filterKategorija, setFilterKategorija] = useState('sve');
  const [novoNaziv, setNovoNaziv] = useState('');
  const [novoKategorija, setNovoKategorija] = useState('');
  const [novoBrojKomada, setNovoBrojKomada] = useState('1');
  const [novoGradilisteId, setNovoGradilisteId] = useState('');
  const [saving, setSaving] = useState(false);
  const [transferInputs, setTransferInputs] = useState({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [alatiData, gradilistaData] = await Promise.all([
        fetchAlati(),
        fetchGradilista(),
      ]);
      setAlati(alatiData);
      setGradilista(gradilistaData);
    } catch (error) {
      // eslint-disable-next-line no-alert
      alert('Ne mogu učitati alate.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isCheckingAuth && !isAuthenticated) {
      f7router.navigate('/login/');
      return;
    }
    if (isCheckingAuth) return;
    loadData();
  }, [isAuthenticated, isCheckingAuth, f7router]);

  if (isCheckingAuth || !isAuthenticated) {
    return null;
  }

  const nazivGradilista = (gradilisteId) => {
    const gradiliste = gradilista.find((item) => String(item.id) === String(gradilisteId));
    return gradiliste?.naziv || 'Glavno skladište';
  };

  const kategorije = Array.from(
    new Set(alati.map((item) => (item.kategorija || '').trim()).filter(Boolean))
  );

  const filtriraniAlati =
    filterKategorija === 'sve'
      ? alati
      : alati.filter((item) => (item.kategorija || '') === filterKategorija);

  const onAdd = async () => {
    const qty = Number(novoBrojKomada);
    if (!novoNaziv.trim()) {
      // eslint-disable-next-line no-alert
      alert('Naziv alata je obavezan.');
      return;
    }
    if (!novoKategorija.trim()) {
      // eslint-disable-next-line no-alert
      alert('Kategorija alata je obavezna.');
      return;
    }
    if (!qty || qty <= 0) {
      // eslint-disable-next-line no-alert
      alert('Količina mora biti veća od 0.');
      return;
    }

    setSaving(true);
    try {
      await createAlat({
        naziv: novoNaziv.trim(),
        kategorija: novoKategorija.trim(),
        brojKomada: qty,
        gradilisteId: String(novoGradilisteId || ''),
      });
      setNovoNaziv('');
      setNovoKategorija('');
      setNovoBrojKomada('1');
      setNovoGradilisteId('');
      await loadData();
    } catch (error) {
      // eslint-disable-next-line no-alert
      alert('Dodavanje alata nije uspjelo.');
    } finally {
      setSaving(false);
    }
  };

  const transferInputFor = (alat) =>
    transferInputs[alat.id] || {
      destinationId: '',
      quantity: String(alat.brojKomada || 1),
    };

  const updateTransferInput = (alatId, patch) => {
    setTransferInputs((prev) => ({
      ...prev,
      [alatId]: {
        ...(prev[alatId] || {}),
        ...patch,
      },
    }));
  };

  const premjestiAlat = async (alat) => {
    const input = transferInputFor(alat);
    const qty = Number(input.quantity);
    const destinationId = String(input.destinationId || '');

    setUpdatingId(alat.id);
    try {
      await transferAlatQuantity({
        alat,
        targetGradilisteId: destinationId,
        quantity: qty,
        sviAlati: alati,
      });
      await loadData();
    } catch (error) {
      // eslint-disable-next-line no-alert
      alert(error.message || 'Premještanje alata nije uspjelo.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <Page>
      <Navbar>
        <NavLeft>
          <Link back iconF7="chevron_left" />
        </NavLeft>
        <NavTitle>Alati</NavTitle>
        <NavRight>
          <Button small onClick={loadData}>
            Osvježi
          </Button>
        </NavRight>
      </Navbar>

      {loading ? (
        <Block strong className="empty-state">
          Učitavanje alata...
        </Block>
      ) : (
        <>
          <List inset>
            <ListInput
              label="Naziv alata"
              placeholder="npr. Lopata"
              value={novoNaziv}
              onInput={(event) => setNovoNaziv(event.target.value)}
            />
            <ListInput
              label="Kategorija"
              placeholder="npr. Ručni alati"
              value={novoKategorija}
              onInput={(event) => setNovoKategorija(event.target.value)}
            />
            <ListInput
              label="Količina"
              type="number"
              min="1"
              value={novoBrojKomada}
              onInput={(event) => setNovoBrojKomada(event.target.value)}
            />
            <ListInput
              type="select"
              label="Početna lokacija"
              value={novoGradilisteId}
              onChange={(event) => setNovoGradilisteId(event.target.value)}
            >
              <option value="">Glavno skladište</option>
              {gradilista.map((gradiliste) => (
                <option key={gradiliste.id} value={gradiliste.id}>
                  {gradiliste.naziv}
                </option>
              ))}
            </ListInput>
            <ListButton onClick={onAdd} disabled={saving}>
              {saving ? 'Spremanje...' : 'Dodaj alat'}
            </ListButton>
          </List>

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
              <ListItem title="Nema alata." />
            ) : (
              filtriraniAlati.map((alat) => (
                <ListItem key={alat.id} title={alat.naziv}>
                  <div>
                    <div>Kategorija: {alat.kategorija || 'N/A'}</div>
                    <div>Broj komada: {alat.brojKomada || 0}</div>
                    <div>Lokacija: {nazivGradilista(alat.gradilisteId)}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                      <select
                        value={transferInputFor(alat).destinationId}
                        onChange={(event) =>
                          updateTransferInput(alat.id, { destinationId: event.target.value })
                        }
                      >
                        <option value="">Glavno skladište</option>
                        {gradilista
                          .filter((g) => String(g.id) !== String(alat.gradilisteId || ''))
                          .map((gradiliste) => (
                            <option key={gradiliste.id} value={String(gradiliste.id)}>
                              {gradiliste.naziv}
                            </option>
                          ))}
                      </select>
                      <input
                        type="number"
                        min="1"
                        max={String(alat.brojKomada || 1)}
                        value={transferInputFor(alat).quantity}
                        onChange={(event) =>
                          updateTransferInput(alat.id, { quantity: event.target.value })
                        }
                        style={{ width: 90 }}
                      />
                      <Button
                        small
                        fill
                        disabled={updatingId === alat.id}
                        onClick={() => premjestiAlat(alat)}
                      >
                        Premjesti
                      </Button>
                    </div>
                  </div>
                </ListItem>
              ))
            )}
          </List>
        </>
      )}
    </Page>
  );
}

export default AlatiPage;