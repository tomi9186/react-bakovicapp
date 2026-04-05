import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';

/**
 * Custom hook za provjeru ima li korisnik određenu dozvolu
 * @param {string|string[]} requiredPermissions - Dozvola/dozvole koje trebamo provjeriti
 * @returns {boolean} True ako korisnik ima dozvolu
 */
export function usePermission(requiredPermissions) {
  const { permissions } = useAuth();
  
  // Ako je jedan string, provjeri ima li tu dozvolu
  if (typeof requiredPermissions === 'string') {
    return hasPermission(permissions, requiredPermissions);
  }
  
  // Ako je niz, provjeri ima li barem jednu od dozvola
  if (Array.isArray(requiredPermissions)) {
    return requiredPermissions.some(perm => hasPermission(permissions, perm));
  }
  
  return false;
}

/**
 * Hook koji vraća sve dozvole korisnika
 * @returns {string[]} Niz dozvola
 */
export function usePermissions() {
  const { permissions } = useAuth();
  return permissions;
}
