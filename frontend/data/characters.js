/**
 * Sacred Friends — 15 Verified Mythology Desktop Companions
 * Stored exclusively in the backend at: backend/data/characters.json
 * (No SQLite, No MongoDB, Pure JSON Storage)
 */
import backendCharactersJson from '../../backend/data/characters.json';

export const charactersData = backendCharactersJson;

/**
 * Helper to fetch the latest character data directly from the Node.js backend API
 */
export async function fetchCharactersFromBackend() {
  try {
    const res = await fetch('/api/characters');
    if (res.ok) {
      const data = await res.json();
      return data.characters || [];
    }
  } catch (err) {
    console.warn('[Characters] Failed to fetch from backend API, using local bundle:', err);
  }
  return backendCharactersJson;
}

export default charactersData;
