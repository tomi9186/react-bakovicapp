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

  // ╔════════════════════════════════════════════════════════════════╗
  // ║ DEBUG ISPIS - Zašto REST request failja?
  // ╚════════════════════════════════════════════════════════════════╝
  if (response.status === 403) {
    console.error('❌ 403 FORBIDDEN on path:', path);
    console.error('  Method:', options.method || 'GET');
    console.error('  Response Status:', response.status);
    
    try {
      const errorData = await response.json();
      console.error('  Error Response:', errorData);
      console.error('  Error Code:', errorData.code);
      console.error('  Error Message:', errorData.message);
      
      // NE odjavljuj automatski ako je to samo edit/transfer problem
      if (errorData.code === 'rest_cannot_edit') {
        throw new Error(`Pristup odbijen: ${errorData.message}. Provjerite da imate dozvolu za ovu akciju.`);
      }
    } catch (e) {
      if (e.message.includes('Pristup odbijen')) {
        throw e;
      }
    }
    
    clearAuth();
    notifyAuthInvalid();
  }

  if (response.status === 401) {
    console.warn('⚠️  401 UNAUTHORIZED - auto logout');
    clearAuth();
    notifyAuthInvalid();
  }

  if (!response.ok) {
    const text = await response.text();
    console.error('Request failed:', {
      path,
      method: options.method || 'GET',
      status: response.status,
      responseText: text,
    });
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

  if (!payload?.token) {
    throw new Error('Login nije uspio');
  }

  console.log('JWT Payload:', payload);

  // Pokušaj dohvatiti korisničke podatke sa custom endpointa PRVO
  let role = 'worker'; // Default - najniža moguća ulog
  console.log('🔍 POČETNI DEFAULT ROLE:', role);
  
  try {
    // PRVO: Pokušaj sa custom endpointom /wp-json/bakovic/v1/user-info
    const customUrl = `${config.baseUrl}/wp-json/bakovic/v1/user-info`;
    console.log('📡 PRVO: Pozivam custom endpoint:', customUrl);
    
    const customResponse = await fetch(customUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${payload.token}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('Custom endpoint response status:', customResponse.status);
    console.log('Custom endpoint response ok:', customResponse.ok);

    if (customResponse.ok) {
      const customData = await customResponse.json();
      console.log('✅ Custom user info:', customData);
      console.log('   - Role:', customData.role);
      console.log('   - Roles array:', customData.roles);
      if (customData.role) {
        role = customData.role;
        console.log('✅ USPJEŠNO - Role from custom endpoint:', role);
      } else {
        console.log('⚠️ Custom data nema "role" polja, pokušavam /users/me...');
        throw new Error('No role in custom response');
      }
    } else {
      const customError = await customResponse.text();
      console.log('❌ Custom endpoint failed (status ' + customResponse.status + ')');
      console.log('   Response:', customError);
      console.log('   Pokušavam fallback /users/me...');
      throw new Error('Custom endpoint failed');
    }
  } catch (customError) {
    console.log('⚠️ Custom endpoint nije dostupan, pokušavam /users/me...');
    console.log('   Custom error:', customError.message);
    
    // FALLBACK: Pokušaj sa /wp-json/wp/v2/users/me
    try {
      const userMeUrl = `${config.baseUrl}/wp-json/wp/v2/users/me`;
      console.log('📡 FALLBACK: Pozivam /users/me endpoint:', userMeUrl);
      
      const userDataResponse = await fetch(userMeUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${payload.token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('User ME Response status:', userDataResponse.status);
      console.log('User ME Response ok:', userDataResponse.ok);

      if (userDataResponse.ok) {
        const userData = await userDataResponse.json();
        console.log('✅ User data from /users/me:', userData);
        console.log('   - ID:', userData.id);
        console.log('   - Username:', userData.username);
        console.log('   - Roles array:', userData.roles);
        
        // Dohvati prvu ulogu iz niza
        if (Array.isArray(userData.roles) && userData.roles.length > 0) {
          role = userData.roles[0];
          console.log('✅ Role from /users/me:', role);
        } else {
          console.log('⚠️ Roles array je prazan ili nije niz - ostaje default role');
        }
      } else {
        const errorText = await userDataResponse.text();
        console.log('❌ User ME endpoint failed (status ' + userDataResponse.status + ')');
        console.log('   Response:', errorText);
      }
    } catch (fallbackError) {
      console.error('❌ Fallback error:', fallbackError);
    }
  }

  console.log('🎯 FINALNI ROLE:', role);

  return {
    token: payload?.token,
    user: {
      username: payload?.user_display_name || username,
      email: payload?.user_email || '',
      role: role,
      roles: [role],
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
  const data = await request(`${config.endpoints.gradilista}?per_page=1000`);
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
  const data = await request(`${config.endpoints.alati}?per_page=1000`);
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
