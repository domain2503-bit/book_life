import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "action_log_device_id";
let _cached: string | null = null;

function makeUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export async function getDeviceId(): Promise<string> {
  if (_cached) return _cached;
  try {
    let id = await AsyncStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = makeUUID();
      await AsyncStorage.setItem(STORAGE_KEY, id);
    }
    _cached = id;
    return id;
  } catch {
    // AsyncStorage 실패 시 세션 내 임시 ID 사용
    if (!_cached) _cached = makeUUID();
    return _cached;
  }
}
