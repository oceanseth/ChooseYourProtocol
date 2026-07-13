import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'stackmax.stack.v1';

export async function loadStack() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveStack(stack) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(stack));
  } catch {
    // ignore for MVP
  }
}

export async function addGroup(group) {
  const stack = await loadStack();
  const next = [{ ...group, id: `pg_${Date.now()}`, joined_at: new Date().toISOString() }, ...stack];
  await saveStack(next);
  return next;
}
