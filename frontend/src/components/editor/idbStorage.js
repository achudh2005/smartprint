import { get, set, del } from 'idb-keyval';

const KEY_PREFIX = 'smartprint_edit_session_';

export async function saveEditSession(fileId, sessionData) {
  try {
    const key = `${KEY_PREFIX}${fileId}`;
    await set(key, {
      ...sessionData,
      updatedAt: Date.now(),
    });
    return true;
  } catch (err) {
    console.warn('[IDB] Failed to autosave edit session:', err);
    return false;
  }
}

export async function getEditSession(fileId) {
  try {
    const key = `${KEY_PREFIX}${fileId}`;
    return await get(key);
  } catch (err) {
    console.warn('[IDB] Failed to restore edit session:', err);
    return null;
  }
}

export async function clearEditSession(fileId) {
  try {
    const key = `${KEY_PREFIX}${fileId}`;
    await del(key);
    return true;
  } catch (err) {
    console.warn('[IDB] Failed to clear edit session:', err);
    return false;
  }
}
