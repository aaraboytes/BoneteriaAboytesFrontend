export interface CameraZone {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Camera {
  id: number;
  name: string;
  storeId: number | null;
  storeName: string | null;
  streamUrl: string;
  isActive: boolean;
  zone: CameraZone | null;
  sensitivity: number;
  calibrationRequested: boolean;
  calibratedAt: string | null;
  doorState: 'UNKNOWN' | 'OPEN' | 'CLOSED';
  doorStateChangedAt: string | null;
  lastSeenAt: string | null;
  online: boolean;
  lastError: string | null;
}

export interface WebcamInfo {
  index: number;
  name: string | null;
  width: number;
  height: number;
  inUse: boolean;
}

export interface StoreOption {
  id: number;
  name: string;
}

export function apiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { message?: string } } })?.response?.data;
  return data?.message || fallback;
}
