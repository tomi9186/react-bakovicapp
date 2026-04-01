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
  createGradiliste,
  deleteGradiliste,
  fetchGradilista,
} from '../services/api';

function GradilistaPage({ f7router }) {
  const { isAuthenticated, isCheckingAuth } = useAuth();
  const [gradilista, setGradilista] = useState([]);
  const [naziv, setNaziv] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    } catch (error) {
      // eslint-disable-next-line no-alert
      alert('Greška pri dodavanju gradilišta.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (event, id) => {
    event.stopPropagation();
    if (!window.confirm('Želite li obrisati gradilište?')) return;
    try {
      await deleteGradiliste(id);
      setGradilista((previous) => previous.filter((item) => item.id !== id));
    } catch (error) {
      // eslint-disable-next-line no-alert
      alert('Greška pri brisanju gradilišta.');
    }
  };

  return (
    <Page>
      <Navbar>
        <NavLeft>
          <Link back iconF7="chevron_left" />
        </NavLeft>
        <NavTitle>Gradilišta</NavTitle>
        <NavRight>
          <Button small onClick={loadData}>
            Osvježi
          </Button>
        </NavRight>
      </Navbar>

      <List inset>
        <ListInput
          label="Novo gradilište"
          placeholder="Unesite naziv"
          value={naziv}
          onInput={(event) => setNaziv(event.target.value)}
        />
        <ListButton onClick={onAdd} disabled={saving}>
          {saving ? 'Spremanje...' : 'Dodaj gradilište'}
        </ListButton>
      </List>

      {loading ? (
        <Block strong className="empty-state">
          Učitavanje gradilišta...
        </Block>
      ) : (
        <List strong inset>
          {gradilista.length === 0 ? (
            <ListItem title="Nema gradilišta." />
          ) : (
            gradilista.map((item) => (
              <ListItem
                key={item.id}
                title={item.naziv}
                subtitle={`${item.slug} | ID: ${item.id}`}
                link
                onClick={() => f7router.navigate(`/gradiliste/${item.id}/`)}
              >
                <div slot="after">
                  <Button
                    small
                    color="red"
                    onClick={(event) => onDelete(event, item.id)}
                  >
                    Obriši
                  </Button>
                </div>
              </ListItem>
            ))
          )}
        </List>
      )}
    </Page>
  );
}

export default GradilistaPage;