import config from '../config';

const TOKEN_KEY = 'bakovicapp_token';
const USER_KEY = 'bakovicapp_user';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  const value = localStorage.getItem(USER_KEY);
  return value ? JSON.parse(value) : null;
}

export function storeAuth(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function notifyAlatiUpdated() {
  window.dispatchEvent(new Event('bakovicapp:alati-updated'));
}

function notifyAuthInvalid() {
  window.dispatchEvent(new Event('bakovicapp:auth-invalid'));
}

async function request(path, options = {}) {
  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${config.baseUrl}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    clearAuth();
    notifyAuthInvalid();
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Greška pri komunikaciji sa serverom.');
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function login(username, password) {
  const payload = await request(config.jwtLoginPath, {
    method: 'POST',
    body: JSON.stringify({ username, password }),
    headers: { 'Content-Type': 'application/json' },
  });

  return {
    token: payload?.token,
    user: {
      username: payload?.user_display_name || username,
      email: payload?.user_email || '',
    },
  };
}

export async function validateToken(token) {
  if (!token) return false;
  try {
    const response = await fetch(`${config.baseUrl}${config.jwtValidatePath}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      clearAuth();
      notifyAuthInvalid();
      return false;
    }
    return true;
  } catch (error) {
    clearAuth();
    notifyAuthInvalid();
    return false;
  }
}

function normalizeTitle(item) {
  if (typeof item?.title === 'string') return item.title;
  return item?.title?.rendered || 'Bez naziva';
}

export async function fetchGradilista() {
  const data = await request(`${config.endpoints.gradilista}?per_page=100`);
  return data.map((item) => ({
    id: item.id,
    slug: item.slug,
    naziv: normalizeTitle(item),
  }));
}

export async function createGradiliste(naziv) {
  const data = await request(config.endpoints.gradilista, {
    method: 'POST',
    body: JSON.stringify({
      title: naziv,
      status: 'publish',
    }),
  });

  return {
    id: data.id,
    slug: data.slug,
    naziv: normalizeTitle(data),
  };
}

export function deleteGradiliste(id) {
  return request(`${config.endpoints.gradilista}/${id}?force=true`, {
    method: 'DELETE',
  });
}

export async function fetchAlati() {
  const data = await request(`${config.endpoints.alati}?per_page=100`);
  return data.map((item) => ({
    id: item.id,
    naziv: normalizeTitle(item),
    kategorija: item?.meta?.kategorija || item?.acf?.kategorija || '',
    brojKomada: Number(item?.meta?.broj_komada || item?.acf?.broj_komada || 0),
    gradilisteId: String(item?.meta?.gradiliste_id || item?.acf?.gradiliste_id || 0),
  }));
}

export async function createAlat({ naziv, kategorija, brojKomada, gradilisteId = '' }) {
  const payload = await request(config.endpoints.alati, {
    method: 'POST',
    body: JSON.stringify({
      title: naziv,
      status: 'publish',
      meta: {
        kategorija,
        broj_komada: Number(brojKomada),
        gradiliste_id: normalizeGradilisteId(gradilisteId),
      },
    }),
  });
  notifyAlatiUpdated();
  return payload;
}

export async function updateAlat(alatId, values) {
  const payload = await request(`${config.endpoints.alati}/${alatId}`, {
    method: 'POST',
    body: JSON.stringify(values),
  });
  notifyAlatiUpdated();
  return payload;
}

export async function deleteAlat(alatId) {
  const payload = await request(`${config.endpoints.alati}/${alatId}?force=true`, {
    method: 'DELETE',
  });
  notifyAlatiUpdated();
  return payload;
}

function normalizeGradilisteId(gradilisteId) {
  if (!gradilisteId || String(gradilisteId).trim() === '') {
    return 0;
  }
  return Number(gradilisteId);
}

export async function transferAlatQuantity({ alat, targetGradilisteId, quantity, sviAlati }) {
  const qty = Number(quantity);
  if (!qty || qty <= 0) {
    throw new Error('Količina za prijenos mora biti veća od 0.');
  }
  if (qty > Number(alat.brojKomada)) {
    throw new Error('Nema dovoljno komada na izvornoj lokaciji.');
  }

  const sourceGradilisteId = String(alat.gradilisteId || '');
  const destinationGradilisteId = String(targetGradilisteId || '');
  if (sourceGradilisteId === destinationGradilisteId) {
    throw new Error('Izvor i teret su ista lokacija.');
  }

  const destination = (sviAlati || []).find(
    (item) =>
      item.id !== alat.id &&
      String(item.gradilisteId) === destinationGradilisteId &&
      item.naziv === alat.naziv &&
      item.kategorija === alat.kategorija
  );

  const sourceRemaining = Number(alat.brojKomada) - qty;

  if (destination) {
    // Alat sa istim nazivom i kategorijom već postoji na ciljanoj lokaciji
    await updateAlat(destination.id, {
      title: destination.naziv,
      status: 'publish',
      meta: {
        kategorija: destination.kategorija,
        broj_komada: Number(destination.brojKomada) + qty,
        gradiliste_id: normalizeGradilisteId(destinationGradilisteId),
      },
    });
  } else {
    // Kreiraj novi alat na ciljanoj lokaciji
    await createAlat({
      naziv: alat.naziv,
      kategorija: alat.kategorija,
      brojKomada: qty,
      gradilisteId: destinationGradilisteId,
    });
  }

  // Smanjti količinu na izvornoj lokaciji ili obriši alat
  if (sourceRemaining <= 0) {
    await deleteAlat(alat.id);
  } else {
    await updateAlat(alat.id, {
      title: alat.naziv,
      status: 'publish',
      meta: {
        kategorija: alat.kategorija,
        broj_komada: sourceRemaining,
        gradiliste_id: normalizeGradilisteId(sourceGradilisteId),
      },
    });
  }
}
