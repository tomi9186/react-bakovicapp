import React, { useEffect, useState } from 'react';
import {
  Block,
  Button,
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
        gradilisteId: novoGradilisteId || 0,
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
      if (String(alat.gradilisteId) === "0" || !alat.gradilisteId) {
        summary.naSkladistu += alat.brojKomada;
      } else {
        summary.naGradilištima += alat.brojKomada;
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
      const lokacija = (alat.gradilisteId && String(alat.gradilisteId) !== "0") ? nazivGradilista(alat.gradilisteId) : 'Glavno skladište';
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

    if (String(sourceAlat.gradilisteId) === destinationId) {
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
        <NavTitle>Alati</NavTitle>
        <NavRight>
          <div
            onClick={() => setShowAddModal(true)}
            style={{ cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </div>
          <div
            onClick={loadData}
            style={{ cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36M20.49 15a9 9 0 0 1-14.85 3.36"></path>
            </svg>
          </div>
        </NavRight>
      </Navbar>

      {loading ? (
        <Block strong className="empty-state">
          Učitavanje alata...
        </Block>
      ) : (
        <>
          <Block
            style={{
              padding: '12px 16px',
              marginBottom: 0,
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
            {generateAlatSummary().length === 0 ? (
              <ListItem title="Nema alata." />
            ) : (
              generateAlatSummary().map((summary) => (
                <ListItem
                  key={`${summary.naziv}|${summary.kategorija}`}
                  onClick={() => openAlatDetails(`${summary.naziv}|${summary.kategorija}`)}
                  style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <div style={{ width: '100%' }}>
                    {/* Kategorija */}
                    <div style={{ fontSize: '11px', color: '#999', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {summary.kategorija}
                    </div>
                    
                    {/* Naslov alata */}
                    <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: 8 }}>
                      {summary.naziv}
                    </div>
                    
                    {/* Dva stupca sa detaljima */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                      <div style={{ fontSize: '13px', flex: 1 }}>
                        Skladište: <strong>{summary.naSkladistu}</strong>
                      </div>
                      <div style={{ fontSize: '13px', flex: 1, textAlign: 'right' }}>
                        Na gradilištu: <strong>{summary.naGradilištima}</strong>
                      </div>
                    </div>
                  </div>
                  
                  {/* Strelica na desnoj strani */}
                  <div style={{ display: 'flex', alignItems: 'center', color: '#999', marginLeft: '16px', flexShrink: 0 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
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
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
            <Button onClick={closeAddModal} disabled={saving}>
              Odustani
            </Button>
            <Button fill onClick={onAdd} disabled={saving}>
              {saving ? 'Spremanje...' : 'Dodaj alat'}
            </Button>
          </div>
        </Block>
      </Sheet>

      {selectedAlatKey && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'flex-end',
            zIndex: 9999,
          }}
          onClick={closeAlatDetails}
        >
          <div
            style={{
              backgroundColor: 'white',
              width: '100%',
              maxHeight: '100vh',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '12px 12px 0 0',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                position: 'relative',
                padding: '16px',
                paddingRight: '44px',
                borderBottom: '1px solid #f0f0f0',
                flexShrink: 0,
              }}
            >
              <h2 style={{ margin: 0, fontSize: '18px', width: '100%' }}>
                {getAlatDetails(selectedAlatKey).naziv}
              </h2>
              <button
                onClick={closeAlatDetails}
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '16px',
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '3px 9.5px',
                  width: 'auto',
                  color: '#999',
                }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: '16px',
              }}
            >
              <p style={{ fontSize: '12px', color: '#999', marginTop: 0 }}>
                {getAlatDetails(selectedAlatKey).kategorija}
              </p>

              <div style={{ marginBottom: 20 }}>
                <h4 style={{ marginTop: 0 }}>Lokacije alata</h4>
                <List inset>
                  {Object.entries(getAlatDetails(selectedAlatKey).lokacije)
                    .sort(([lokacija1], [lokacija2]) => {
                      if (lokacija1 === 'Glavno skladište') return -1;
                      if (lokacija2 === 'Glavno skladište') return 1;
                      return lokacija1.localeCompare(lokacija2);
                    })
                    .map(([lokacija, instances]) => (
                    <ListItem key={lokacija}>
                      <div style={{ width: '100%' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>
                          {lokacija}
                        </div>
                        {instances.map((instance, idx) => (
                          <div key={idx} style={{ fontSize: '12px', marginBottom: 4 }}>
                            {instance.brojKomada}
                          </div>
                        ))}
                      </div>
                    </ListItem>
                  ))}
                </List>
              </div>

              <div style={{ marginBottom: 20 }}>
                <h4 style={{ marginTop: 0 }}>Premjesti alat</h4>
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
                    {getAlatDetails(selectedAlatKey).instances
                      .sort((a, b) => {
                        const aIsMain = String(a.gradilisteId) === "0";
                        const bIsMain = String(b.gradilisteId) === "0";
                        if (aIsMain && !bIsMain) return -1;
                        if (!aIsMain && bIsMain) return 1;
                        return 0;
                      })
                      .map((instance) => {
                      const lokacija = (instance.gradilisteId && String(instance.gradilisteId) !== "0") ? nazivGradilista(instance.gradilisteId) : 'Glavno skladište';
                      return (
                        <option key={instance.id} value={instance.id}>
                          {lokacija} ({instance.brojKomada})
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
                    <option value="0">Glavno skladište</option>
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
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '16px',
                borderTop: '1px solid #f0f0f0',
                display: 'flex',
                gap: '8px',
                flexShrink: 0,
                justifyContent: 'space-between',
              }}
            >
              <Button onClick={closeAlatDetails}>Zatvori</Button>
              <Button fill onClick={doTransfer} disabled={updatingId !== null}>
                {updatingId ? 'Premještanje...' : 'Premjesti alat'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}

export default AlatiPage;