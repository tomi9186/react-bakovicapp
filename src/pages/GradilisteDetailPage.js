import React, { useEffect, useMemo, useState } from 'react';
import {
  Block,
  Button,
  List,
  ListItem,
  ListInput,
  Navbar,
  NavLeft,
  NavRight,
  NavTitle,
  Page,
  Sheet,
} from 'framework7-react';
import { useAuth } from '../context/AuthContext';
import { usePermission } from '../hooks/usePermission';
import { PERMISSIONS } from '../utils/permissions';
import { createAlat, fetchAlati, fetchGradilista, deleteGradiliste, updateAlat, transferAlatQuantity } from '../services/api';

function GradilisteDetailPage({ f7route, f7router }) {
  const { isAuthenticated, isCheckingAuth } = useAuth();
  const canDeleteGradiliste = usePermission(PERMISSIONS.DELETE_GRADILISTE);
  const [gradiliste, setGradiliste] = useState(null);
  const [alati, setAlati] = useState([]);
  const [gradilista, setGradilista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterKategorija, setFilterKategorija] = useState('sve');
  const [showTransferSheet, setShowTransferSheet] = useState(false);
  const [transferSelection, setTransferSelection] = useState({});
  const [transferring, setTransferring] = useState(false);
  const [selectedAlat, setSelectedAlat] = useState(null);
  const [transferDestinationId, setTransferDestinationId] = useState('');
  const [transferQuantity, setTransferQuantity] = useState('1');
  const [updatingId, setUpdatingId] = useState(null);
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
        setGradilista(svaGradilista);
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
      ).sort(),
    [alatiNaGradilistu]
  );

  const filtriraniAlati = useMemo(
    () =>
      filterKategorija === 'sve'
        ? alatiNaGradilistu
        : alatiNaGradilistu.filter((item) => (item.kategorija || '') === filterKategorija),
    [alatiNaGradilistu, filterKategorija]
  );

  // Generiraj sažetak alata kao na AlatiPage
  const generateAlatSummary = () => {
    const summaryMap = new Map();

    filtriraniAlati.forEach((alat) => {
      const key = `${alat.naziv}|${alat.kategorija}`;
      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          naziv: alat.naziv,
          kategorija: alat.kategorija,
          ukupno: 0,
        });
      }
      const summary = summaryMap.get(key);
      summary.ukupno += alat.brojKomada;
    });

    return Array.from(summaryMap.values()).sort((a, b) => a.naziv.localeCompare(b.naziv));
  };

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

  // Alati na glavnom skladištu
  const alatiNaSkladistu = useMemo(
    () => alati.filter((alat) => String(alat.gradilisteId) === '0' || !alat.gradilisteId),
    [alati]
  );

  // Grupiraj po kategoriji
  const kategorijeSkladista = useMemo(
    () =>
      Array.from(
        new Set(alatiNaSkladistu.map((item) => (item.kategorija || '').trim()).filter(Boolean))
      ).sort(),
    [alatiNaSkladistu]
  );

  const doTransferAlati = async () => {
    const idsToTransfer = Object.keys(transferSelection).filter((id) => transferSelection[id] > 0);
    
    if (idsToTransfer.length === 0) {
      // eslint-disable-next-line no-alert
      alert('Trebate odabrati barem jedan alat za premještanje.');
      return;
    }

    setTransferring(true);
    try {
      for (const alatId of idsToTransfer) {
        const alat = alatiNaSkladistu.find((a) => String(a.id) === alatId);
        const quantity = transferSelection[alatId];

        if (!alat || quantity > alat.brojKomada) {
          // eslint-disable-next-line no-alert
          alert(`Nema dovoljno ${alat?.naziv} na skladištu.`);
          setTransferring(false);
          return;
        }

        // Ako je sva količina prenesena, obriši zapis
        if (quantity === alat.brojKomada) {
          await updateAlat(alat.id, {
            title: alat.naziv,
            status: 'publish',
            meta: {
              kategorija: alat.kategorija,
              broj_komada: 0,
              gradiliste_id: '0',
            },
          });
        } else {
          // Inače samo ažuriraj količinu
          await updateAlat(alat.id, {
            title: alat.naziv,
            status: 'publish',
            meta: {
              kategorija: alat.kategorija,
              broj_komada: alat.brojKomada - quantity,
              gradiliste_id: '0',
            },
          });
        }

        // Kreiraj novi zapis za gradilište
        const existingOnSite = alati.find(
          (a) => String(a.naziv) === String(alat.naziv) && String(a.gradilisteId) === id
        );

        if (existingOnSite) {
          // Ažuriraj postojeći
          await updateAlat(existingOnSite.id, {
            title: alat.naziv,
            status: 'publish',
            meta: {
              kategorija: alat.kategorija,
              broj_komada: existingOnSite.brojKomada + quantity,
              gradiliste_id: id,
            },
          });
        } else {
          // Kreiraj novu stavku za gradilište
          await createAlat({
            naziv: alat.naziv,
            kategorija: alat.kategorija,
            brojKomada: quantity,
            gradilisteId: id,
          });
        }
      }

      // Osvježi podatke
      const sviAlati = await fetchAlati();
      setAlati(sviAlati);
      setShowTransferSheet(false);
      setTransferSelection({});
    } catch (error) {
      // eslint-disable-next-line no-alert
      alert('Greška pri premještanju alata.');
    } finally {
      setTransferring(false);
    }
  };

  const closeAlatDetails = () => {
    setSelectedAlat(null);
    setTransferDestinationId('');
    setTransferQuantity('1');
  };

  const doTransfer = async () => {
    if (!selectedAlat) return;

    const qty = Number(transferQuantity);

    if (!transferDestinationId) {
      // eslint-disable-next-line no-alert
      alert('Odaberite gdje želite prebaciti alat.');
      return;
    }

    if (String(selectedAlat.gradilisteId) === transferDestinationId) {
      // eslint-disable-next-line no-alert
      alert('Alat je već na toj lokaciji.');
      return;
    }

    if (!qty || qty <= 0) {
      // eslint-disable-next-line no-alert
      alert('Količina mora biti veća od 0.');
      return;
    }

    if (qty > selectedAlat.brojKomada) {
      // eslint-disable-next-line no-alert
      alert('Nema dovoljno komada.');
      return;
    }

    setUpdatingId(selectedAlat.id);
    try {
      await transferAlatQuantity({
        alat: selectedAlat,
        targetGradilisteId: transferDestinationId,
        quantity: qty,
        sviAlati: alati,
      });

      // Osvježi podatke
      const sviAlati = await fetchAlati();
      setAlati(sviAlati);
      closeAlatDetails();
    } catch (error) {
      // eslint-disable-next-line no-alert
      alert('Greška pri premještanju alata.');
    } finally {
      setUpdatingId(null);
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
          {canDeleteGradiliste && (
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
          )}
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

          <Block style={{ padding: '12px 16px', marginBottom: 0 }}>
            <Button
              fill
              onClick={() => setShowTransferSheet(true)}
              style={{ width: '100%' }}
            >
              Dodaj alat
            </Button>
          </Block>

          <List strong inset>
            {generateAlatSummary().length === 0 ? (
              <ListItem title="Nema alata na ovom gradilištu." />
            ) : (
              generateAlatSummary().map((summary) => {
                const firstAlat = alatiNaGradilistu.find(
                  (alat) => alat.naziv === summary.naziv && alat.kategorija === summary.kategorija
                );
                return (
                  <ListItem
                    key={`${summary.naziv}|${summary.kategorija}`}
                    onClick={() => firstAlat && setSelectedAlat(firstAlat)}
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
                      
                      {/* Komada */}
                      <div style={{ fontSize: '13px' }}>
                        Komada: <strong>{summary.ukupno}</strong>
                      </div>
                    </div>
                    
                    {/* Strelica na desnoj strani */}
                    <div style={{ display: 'flex', alignItems: 'center', color: '#999', marginLeft: '16px', flexShrink: 0 }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </div>
                  </ListItem>
                );
              })
            )}
          </List>
        </>
      )}

      <Sheet
        opened={showTransferSheet}
        onSheetClosed={() => {
          setShowTransferSheet(false);
          setTransferSelection({});
        }}
        style={{ height: 'auto' }}
      >
        <Block style={{ paddingTop: 20 }}>
          <Block strong style={{ marginBottom: 10 }}>
            <h2>Dodaj alate sa skladišta</h2>
          </Block>
        </Block>

        {alatiNaSkladistu.length === 0 ? (
          <Block>
            <p style={{ color: '#999', textAlign: 'center' }}>Nema alata na glavnom skladištu.</p>
          </Block>
        ) : (
          <>
            {kategorijeSkladista.map((kategorija) => {
              const alatiKategorije = alatiNaSkladistu.filter(
                (alat) => (alat.kategorija || '').trim() === kategorija.trim()
              );
              return (
                <Block key={kategorija} style={{ padding: '0 16px 16px 16px' }}>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: '#666',
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {kategorija}
                  </div>
                  {alatiKategorije.map((alat) => (
                    <div
                      key={alat.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px',
                        backgroundColor: '#f5f5f5',
                        borderRadius: '6px',
                        marginBottom: '8px',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: '500' }}>
                          {alat.naziv}
                        </div>
                        <div style={{ fontSize: '12px', color: '#999' }}>
                          Dostupno: {alat.brojKomada}
                        </div>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max={alat.brojKomada}
                        value={transferSelection[alat.id] || 0}
                        onChange={(e) => {
                          const val = Math.max(0, Math.min(parseInt(e.target.value) || 0, alat.brojKomada));
                          setTransferSelection({
                            ...transferSelection,
                            [alat.id]: val,
                          });
                        }}
                        style={{
                          width: '50px',
                          padding: '6px 8px',
                          borderRadius: '4px',
                          border: '1px solid #ddd',
                          fontSize: '14px',
                          textAlign: 'center',
                        }}
                      />
                    </div>
                  ))}
                </Block>
              );
            })}
          </>
        )}

        <Block style={{ padding: '16px', display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
          <Button
            onClick={() => {
              setShowTransferSheet(false);
              setTransferSelection({});
            }}
            disabled={transferring}
          >
            Odustani
          </Button>
          <Button fill onClick={doTransferAlati} disabled={transferring}>
            {transferring ? 'Premještanje...' : 'Dodaj odabrane'}
          </Button>
        </Block>
      </Sheet>

      {/* Detalji alata i transfer modal */}
      {selectedAlat && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'flex-end',
          }}
          onClick={closeAlatDetails}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              backgroundColor: 'white',
              borderRadius: '12px 12px 0 0',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideUp 0.3s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ position: 'relative', padding: '16px', paddingRight: '44px', borderBottom: '1px solid #f0f0f0' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>
                {selectedAlat.naziv}
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
                  color: '#999',
                  width: 'auto',
                }}
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                minHeight: 0,
              }}
            >
              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                  Kategorija
                </div>
                <div style={{ fontSize: '14px', fontWeight: '500' }}>
                  {selectedAlat.kategorija}
                </div>
              </div>

              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                  Dostupno na gradilištu
                </div>
                <div style={{ fontSize: '14px', fontWeight: '500' }}>
                  {selectedAlat.brojKomada} komada
                </div>
              </div>

              <List inset style={{ margin: 0 }}>
                <ListInput
                  type="select"
                  label="Gdje šaljem"
                  value={transferDestinationId}
                  onChange={(event) => setTransferDestinationId(event.target.value)}
                >
                  <option value="">Odaberite lokaciju</option>
                  <option value="0">Glavno skladište</option>
                  {gradilista
                    .filter((g) => String(g.id) !== id)
                    .map((g) => (
                      <option key={g.id} value={String(g.id)}>
                        {g.naziv}
                      </option>
                    ))}
                </ListInput>

                <ListInput
                  label="Količina"
                  type="number"
                  min="1"
                  max={String(selectedAlat.brojKomada)}
                  value={transferQuantity}
                  onInput={(event) => setTransferQuantity(event.target.value)}
                />
              </List>
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
              <Button onClick={closeAlatDetails} disabled={updatingId !== null}>
                Zatvori
              </Button>
              <Button fill onClick={doTransfer} disabled={updatingId !== null}>
                {updatingId ? 'Premještanje...' : 'Premjesti'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </Page>
  );
}

export default GradilisteDetailPage;