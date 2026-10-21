import { db, doc, getDoc, setDoc } from '../firebaseClient';

export interface PolymerSecurityConfig {
  isSet: boolean;
  password?: string;
  hint?: string;
  updatedAt?: string;
}

const SECURITY_DOC_REF = () => doc(db, 'dashboard_security', 'polymer_password');
const SESSION_STORAGE_KEY = 'polymer_dashboard_unlocked_session';

/**
 * Membaca status dan konfigurasi password Dashboard Polymer dari database Firebase Firestore
 */
export async function getPolymerSecurityConfig(): Promise<PolymerSecurityConfig> {
  try {
    const docSnap = await getDoc(SECURITY_DOC_REF());
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        isSet: Boolean(data?.isSet && data?.password),
        password: data?.password || '',
        hint: data?.hint || '',
        updatedAt: data?.updatedAt || '',
      };
    }
    return { isSet: false };
  } catch (error) {
    console.error('Error fetching Polymer security config from Firebase:', error);
    // Fallback if offline or initial read failed: check localStorage backup
    const local = localStorage.getItem('polymer_sec_backup');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        return { isSet: Boolean(parsed.password), ...parsed };
      } catch (e) {}
    }
    return { isSet: false };
  }
}

/**
 * Menyimpan password baru atau inisialisasi password ke database Firebase Firestore
 */
export async function savePolymerPassword(password: string, hint: string = ''): Promise<{ success: boolean; error?: string }> {
  if (!password || password.trim().length === 0) {
    return { success: false, error: 'Password tidak boleh kosong.' };
  }
  const cleanPassword = password.trim();
  const payload = {
    password: cleanPassword,
    isSet: true,
    hint: hint.trim(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(SECURITY_DOC_REF(), payload, { merge: true });
    try {
      localStorage.setItem('polymer_sec_backup', JSON.stringify(payload));
    } catch (e) {}
    return { success: true };
  } catch (error: any) {
    console.error('Error saving Polymer password to Firebase:', error);
    // Even if remote error, save local backup
    try {
      localStorage.setItem('polymer_sec_backup', JSON.stringify(payload));
      return { success: true };
    } catch (e) {}
    return { success: false, error: error?.message || 'Gagal menyimpan password.' };
  }
}

/**
 * Mengubah password yang sudah ada di database Firebase Firestore
 */
export async function updatePolymerPassword(
  oldPasswordInput: string,
  newPasswordInput: string,
  newHint: string = ''
): Promise<{ success: boolean; error?: string }> {
  const currentConfig = await getPolymerSecurityConfig();
  if (!currentConfig.isSet) {
    return savePolymerPassword(newPasswordInput, newHint);
  }

  if (oldPasswordInput !== currentConfig.password) {
    return { success: false, error: 'Password lama salah!' };
  }

  if (!newPasswordInput || newPasswordInput.trim().length === 0) {
    return { success: false, error: 'Password baru tidak boleh kosong!' };
  }

  return savePolymerPassword(newPasswordInput, newHint);
}

/**
 * Status sesi unlock browser
 */
export function isPolymerSessionUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(SESSION_STORAGE_KEY) === 'true';
}

export function setPolymerSessionUnlocked(unlocked: boolean): void {
  if (typeof window === 'undefined') return;
  if (unlocked) {
    sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');
  } else {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }
}
