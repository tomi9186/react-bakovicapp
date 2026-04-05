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
import { usePermission } from '../hooks/usePermission';
import { PERMISSIONS } from '../utils/permissions';
import {
  createGradiliste,
  fetchGradilista,
} from '../services/api';

function GradilistaPage({ f7router }) {
  const { isAuthenticated, isCheckingAuth } = useAuth();
  const canCreateGradiliste = usePermission(PERMISSIONS.CREATE_GRADILISTE);
  const [gradilista, setGradilista] = useState([]);
  const [naziv, setNaziv] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [searchText, setSearchText] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchGradilista();
      setGradilista(data);
    } catch (error) {
      // eslint-disable-next-line no-alert
      alert('Ne mogu učitati gradilišta.');
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

  const onAdd = async () => {
    if (!naziv.trim()) return;
    setSaving(true);
    try {
      const created = await createGradiliste(naziv.trim());
      setGradilista((previous) => [created, ...previous]);
      setNaziv('');
      setShowAddSheet(false);
    } catch (error) {
      // eslint-disable-next-line no-alert
      alert('Greška pri dodavanju gradilišta.');
    } finally {
      setSaving(false);
    }
  };

  const closeAddSheet = () => {
    setNaziv('');
    setShowAddSheet(false);
  };

  const filtriranaGradilista = gradilista.filter((item) =>
    item.naziv.toLowerCase().includes(searchText.toLowerCase())
  );

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
        <NavTitle>Gradilišta</NavTitle>
        <NavRight>
          {canCreateGradiliste && (
            <div
              onClick={() => setShowAddSheet(true)}
              style={{ cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </div>
          )}
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
          Učitavanje gradilišta...
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
              Pretraži gradilišta
            </label>
            <input
              type="text"
              placeholder="Upišite naziv gradilišta"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #ddd',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </Block>

          <List strong inset>
            {filtriranaGradilista.length === 0 ? (
              <ListItem title={searchText ? 'Nema rezultata.' : 'Nema gradilišta.'} />
            ) : (
              filtriranaGradilista.map((item) => (
              <ListItem
                key={item.id}
                title={item.naziv}
                subtitle={`${item.slug} | ID: ${item.id}`}
                onClick={() => f7router.navigate(`/gradiliste/${item.id}/`)}
              >
                <div slot="after" style={{ display: 'flex', alignItems: 'center' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        opened={showAddSheet}
        onSheetClosed={closeAddSheet}
        style={{ height: 'auto' }}
      >
        <Block style={{ paddingTop: 20 }}>
          <Block strong style={{ marginBottom: 10 }}>
            <h2>Dodaj novo gradilište</h2>
          </Block>
          <List inset>
            <ListInput
              label="Naziv gradilišta"
              placeholder="Unesite naziv"
              value={naziv}
              onInput={(event) => setNaziv(event.target.value)}
            />
          </List>
        </Block>
        <Block>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
            <Button onClick={closeAddSheet} disabled={saving}>
              Odustani
            </Button>
            <Button fill onClick={onAdd} disabled={saving}>
              {saving ? 'Spremanje...' : 'Dodaj gradilište'}
            </Button>
          </div>
        </Block>
      </Sheet>    </Page>
  );
}

export default GradilistaPage;