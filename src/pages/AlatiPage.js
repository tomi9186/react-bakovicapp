import React, { useEffect, useState } from 'react';
import {
  Block,
  Button,
  Link,
  List,
  ListInput,
  ListItem,
  Sheet,
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [novoNaziv, setNovoNaziv] = useState('');
  const [novoKategorija, setNovoKategorija] = useState('');
  const [novoBrojKomada, setNovoBrojKomada] = useState('1');
  const [novoGradilisteId, setNovoGradilisteId] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedAlatKey, setSelectedAlatKey] = useState(null);
  const [transferSourceId, setTransferSourceId] = useState(null);
  const [transferDestinationId, setTransferDestinationId] = useState('');
  const [transferQuantity, setTransferQuantity] = useState('1');

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
      setShowAddModal(false);
      await loadData();
    } catch (error) {
      // eslint-disable-next-line no-alert
      alert('Dodavanje alata nije uspjelo.');
    } finally {
      setSaving(false);
    }
  };

  const closeAddModal = () => {
    setNovoNaziv('');
    setNovoKategorija('');
    setNovoBrojKomada('1');
    setNovoGradilisteId('');
    setShowAddModal(false);
  };

  const generateAlatSummary = () => {
    const summaryMap = new Map();
    
    alati.forEach((alat) => {
      // Primeni filter kategorije
      if (filterKategorija !== 'sve' && alat.kategorija !== filterKategorija) {
        return;
      }

      const key = `${alat.naziv}|${alat.kategorija}`;
      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          naziv: alat.naziv,
          kategorija: alat.kategorija,
          naSkladistu: 0,
          naGradilištima: 0,
          ukupno: 0,
        });
      }
      const summary = summaryMap.get(key);
      if (alat.gradilisteId) {
        summary.naGradilištima += alat.brojKomada;
      } else {
        summary.naSkladistu += alat.brojKomada;
      }
      summary.ukupno += alat.brojKomada;
    });
    
    return Array.from(summaryMap.values())
      .sort((a, b) => a.naziv.localeCompare(b.naziv));
  };

  const getAlatDetails = (alatKey) => {
    const [naziv, kategorija] = alatKey.split('|');
    const instances = alati.filter((alat) => alat.naziv === naziv && alat.kategorija === kategorija);
    
    const details = {
      naziv,
      kategorija,
      lokacije: {},
      ukupno: 0,
      instances: instances,
    };

    instances.forEach((alat) => {
      const lokacija = alat.gradilisteId ? nazivGradilista(alat.gradilisteId) : 'Glavno skladište';
      if (!details.lokacije[lokacija]) {
        details.lokacije[lokacija] = [];
      }
      details.lokacije[lokacija].push(alat);
      details.ukupno += alat.brojKomada;
    });

    return details;
  };

  const openAlatDetails = (alatKey) => {
    setSelectedAlatKey(alatKey);
    setTransferSourceId(null);
    setTransferDestinationId('');
    setTransferQuantity('1');
  };

  const closeAlatDetails = () => {
    setSelectedAlatKey(null);
  };

  const getMaxTransferQuantity = () => {
    if (!selectedAlatKey || !transferSourceId) return 0;
    
    const details = getAlatDetails(selectedAlatKey);
    const sourceAlat = details.instances.find((instance) => instance.id === transferSourceId);
    
    return sourceAlat ? sourceAlat.brojKomada : 0;
  };

  const doTransfer = async () => {
    if (!selectedAlatKey || !transferSourceId) return;

    const details = getAlatDetails(selectedAlatKey);
    const sourceAlat = details.instances.find((instance) => instance.id === transferSourceId);
    
    if (!sourceAlat) {
      // eslint-disable-next-line no-alert
      alert('Greška: Nije pronađen alat za transfer.');
      return;
    }

    const qty = Number(transferQuantity);
    const destinationId = String(transferDestinationId || '');

    if (!destinationId) {
      // eslint-disable-next-line no-alert
      alert('Odaberite ciljnu lokaciju.');
      return;
    }

    if (String(sourceAlat.gradilisteId || '') === destinationId) {
      // eslint-disable-next-line no-alert
      alert('Izvorišna i ciljna lokacija su iste.');
      return;
    }

    if (!qty || qty <= 0) {
      // eslint-disable-next-line no-alert
      alert('Količina mora biti veća od 0.');
      return;
    }

    if (qty > sourceAlat.brojKomada) {
      // eslint-disable-next-line no-alert
      alert('Nema dovoljno komada na izabranoj lokaciji.');
      return;
    }

    setUpdatingId(sourceAlat.id);
    try {
      await transferAlatQuantity({
        alat: sourceAlat,
        targetGradilisteId: destinationId,
        quantity: qty,
        sviAlati: alati,
      });

      await loadData();
      setTransferDestinationId('');
      setTransferQuantity('1');
      setTransferSourceId(null);
      closeAlatDetails();
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
          <Link back>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </Link>
        </NavLeft>
        <NavTitle>Alati</NavTitle>
        <NavRight>
          <Button small onClick={() => setShowAddModal(true)}>
            Dodaj
          </Button>
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

          <Block strong className="text-align-center" style={{ paddingBottom: 0 }}>
            <h4>Dostupni alati</h4>
          </Block>

          <List strong inset>
            {generateAlatSummary().length === 0 ? (
              <ListItem title="Nema alata." />
            ) : (
              generateAlatSummary().map((summary) => (
                <ListItem
                  key={`${summary.naziv}|${summary.kategorija}`}
                  link
                  onClick={() => openAlatDetails(`${summary.naziv}|${summary.kategorija}`)}
                  title={summary.naziv}
                >
                  <div className="text-align-left" style={{ paddingTop: 8, paddingBottom: 8 }}>
                    <div style={{ fontSize: '12px', color: '#999', marginBottom: 8 }}>
                      {summary.kategorija}
                    </div>
                    <div style={{ fontSize: '13px', marginBottom: 4 }}>
                      Na skladištu: <strong>{summary.naSkladistu} kom.</strong>
                    </div>
                    <div style={{ fontSize: '13px' }}>
                      Na gradilištima: <strong>{summary.naGradilištima} kom.</strong>
                    </div>
                  </div>
                </ListItem>
              ))
            )}
          </List>
        </>
      )}

      <Sheet
        opened={showAddModal}
        onSheetClosed={closeAddModal}
        style={{ height: 'auto' }}
      >
        <Block style={{ paddingTop: 20 }}>
          <Block strong style={{ marginBottom: 10 }}>
            <h2>Dodaj novi alat</h2>
          </Block>
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
          </List>
        </Block>
        <Block>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button fill onClick={onAdd} disabled={saving}>
              {saving ? 'Spremanje...' : 'Dodaj alat'}
            </Button>
            <Button onClick={closeAddModal} disabled={saving}>
              Odustani
            </Button>
          </div>
        </Block>
      </Sheet>

      {selectedAlatKey && (
        <Sheet
          opened={!!selectedAlatKey}
          onSheetClosed={closeAlatDetails}
          swipeToClose
          style={{ 
            height: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ 
            flex: 1, 
            overflowY: 'auto',
            overflowX: 'hidden'
          }}>
            <Block style={{ paddingTop: 20 }}>
              <Block strong style={{ marginBottom: 10 }}>
                <h2>{getAlatDetails(selectedAlatKey).naziv}</h2>
                <p style={{ fontSize: '12px', color: '#999' }}>
                  {getAlatDetails(selectedAlatKey).kategorija}
                </p>
              </Block>

              <Block strong style={{ marginBottom: 15 }}>
                <h4>Lokacije alata</h4>
                <List inset>
                  {Object.entries(getAlatDetails(selectedAlatKey).lokacije).map(([lokacija, instances]) => (
                    <ListItem key={lokacija}>
                      <div style={{ width: '100%' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
                          {lokacija}
                        </div>
                        {instances.map((instance, idx) => (
                          <div key={idx} style={{ fontSize: '12px', marginBottom: 4 }}>
                            {instance.brojKomada} kom.
                          </div>
                        ))}
                      </div>
                    </ListItem>
                  ))}
                </List>
              </Block>

              <Block strong style={{ marginBottom: 15 }}>
                <h4>Premjesti alat</h4>
                <List inset>
                  <ListInput
                    type="select"
                    label="Odakle prebacujem"
                    value={transferSourceId || ''}
                    onChange={(event) => {
                      setTransferSourceId(event.target.value ? Number(event.target.value) : null);
                      setTransferQuantity('1');
                    }}
                  >
                    <option value="">Odaberite lokaciju</option>
                    {getAlatDetails(selectedAlatKey).instances.map((instance) => {
                      const lokacija = instance.gradilisteId ? nazivGradilista(instance.gradilisteId) : 'Glavno skladište';
                      return (
                        <option key={instance.id} value={instance.id}>
                          {lokacija} ({instance.brojKomada} kom.)
                        </option>
                      );
                    })}
                  </ListInput>
                  <ListInput
                    type="select"
                    label="Gdje šaljem"
                    value={transferDestinationId}
                    onChange={(event) => setTransferDestinationId(event.target.value)}
                    disabled={!transferSourceId}
                  >
                    <option value="">Odaberite lokaciju</option>
                    <option value="">Glavno skladište</option>
                    {gradilista.map((gradiliste) => (
                      <option key={gradiliste.id} value={String(gradiliste.id)}>
                        {gradiliste.naziv}
                      </option>
                    ))}
                  </ListInput>
                  <ListInput
                    label="Količina"
                    type="number"
                    min="1"
                    max={String(getMaxTransferQuantity())}
                    value={transferQuantity}
                    onInput={(event) => setTransferQuantity(event.target.value)}
                    disabled={!transferSourceId}
                  />
                </List>
              </Block>
            </Block>
          </div>

          <Block style={{ paddingBottom: 20 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button fill onClick={doTransfer} disabled={updatingId !== null}>
                {updatingId ? 'Premještanje...' : 'Premjesti alat'}
              </Button>
              <Button onClick={closeAlatDetails}>Zatvori</Button>
            </div>
          </Block>
        </Sheet>
      )}
    </Page>
  );
}

export default AlatiPage;