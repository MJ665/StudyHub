import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Persists the last web theme's native-shell colors so a returning user doesn't
 * see a boot flash (the web default is Navy Light / white, but the shell would
 * otherwise launch on the deep-navy brand color). The web posts a THEME message
 * with { bg, dark }; we cache it and restore it on next launch.
 */
export interface Shell {
  bg: string;
  dark: boolean;
}

const KEY = 'sb_shell';

export async function loadShell(): Promise<Shell | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Shell;
    if (typeof s?.bg === 'string' && typeof s?.dark === 'boolean') return s;
    return null;
  } catch {
    return null;
  }
}

export async function saveShell(shell: Shell): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(shell));
  } catch {
    /* best-effort — a failed cache just means the next launch uses the default */
  }
}
