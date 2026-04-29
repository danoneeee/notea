const USER_ID_KEY = 'notea_user_id';

export function getScopedStorageKey(baseKey: string) {
  const userId = localStorage.getItem(USER_ID_KEY)?.trim();
  return userId ? `${baseKey}:${userId}` : baseKey;
}

