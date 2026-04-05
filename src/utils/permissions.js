/**
 * Sustav dozvola baziran na ulogama
 * 
 * Dozvole:
 * - CREATE_ALAT: Može kreirati nove alate
 * - DELETE_ALAT: Može brisati alate
 * - EDIT_ALAT_QUANTITY: Može mijenjati količinu alata na glavnom skladištu
 * - TRANSFER_ALAT: Može prebacivati alate između lokacija
 * - CREATE_GRADILISTE: Može kreirati novo gradilište
 * - DELETE_GRADILISTE: Može brisati gradilista
 * - EDIT_GRADILISTE: Može uređivati gradilista
 */

export const ROLES = {
  ADMINISTRATOR: 'administrator',
  GRADILISTE_LEAD: 'gradiliste_lead',
  WAREHOUSE_MANAGER: 'warehouse_manager',
  WORKER: 'worker',
};

export const PERMISSIONS = {
  CREATE_ALAT: 'create_alat',
  DELETE_ALAT: 'delete_alat',
  EDIT_ALAT_QUANTITY: 'edit_alat_quantity',
  TRANSFER_ALAT: 'transfer_alat',
  CREATE_GRADILISTE: 'create_gradiliste',
  DELETE_GRADILISTE: 'delete_gradiliste',
  EDIT_GRADILISTE: 'edit_gradiliste',
};

/**
 * Mapira uloge na dozvole
 */
export const ROLE_PERMISSIONS = {
  [ROLES.ADMINISTRATOR]: [
    PERMISSIONS.CREATE_ALAT,
    PERMISSIONS.DELETE_ALAT,
    PERMISSIONS.EDIT_ALAT_QUANTITY,
    PERMISSIONS.TRANSFER_ALAT,
    PERMISSIONS.CREATE_GRADILISTE,
    PERMISSIONS.DELETE_GRADILISTE,
    PERMISSIONS.EDIT_GRADILISTE,
  ],
  
  [ROLES.WAREHOUSE_MANAGER]: [
    PERMISSIONS.CREATE_ALAT,
    PERMISSIONS.DELETE_ALAT,
    PERMISSIONS.EDIT_ALAT_QUANTITY,
    PERMISSIONS.TRANSFER_ALAT,
  ],
  
  [ROLES.GRADILISTE_LEAD]: [
    PERMISSIONS.TRANSFER_ALAT,
    // Ne može kreirati alate, brisati alate ili uređivati glavno skladište
  ],
  
  [ROLES.WORKER]: [
    // Samo čitanje
  ],
};

/**
 * Dohvaća dozvole za datu ulogu
 * @param {string} role - Uloga korisnika
 * @returns {string[]} Niz dozvola
 */
export function getPermissionsForRole(role) {
  if (!role) return [];
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Provjerava ima li korisnik određenu dozvolu
 * @param {string[]} permissions - Niz dozv korisnika
 * @param {string} requiredPermission - Dozvola koja se traži
 * @returns {boolean}
 */
export function hasPermission(permissions, requiredPermission) {
  return Array.isArray(permissions) && permissions.includes(requiredPermission);
}
