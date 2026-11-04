export interface DeviceInfo {
  deviceId: string;
  label: string;
}

const KEY = "ass.device";

function guessLabel(): string {
  if (typeof navigator === "undefined") return "Device";
  const ua = navigator.userAgent;
  const os = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Mac OS X/.test(ua)
          ? "Mac"
          : /Windows/.test(ua)
            ? "Windows"
            : /Linux/.test(ua)
              ? "Linux"
              : "Device";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Browser";
  return `${browser} on ${os}`;
}

/** Stable per-browser device identity (cached in localStorage; not a secret). */
export function getDevice(): DeviceInfo {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DeviceInfo;
      if (parsed.deviceId) return parsed;
    }
  } catch {
    // fall through and create a new identity
  }
  const device = { deviceId: crypto.randomUUID(), label: guessLabel() };
  try {
    localStorage.setItem(KEY, JSON.stringify(device));
  } catch {
    // storage unavailable (private mode) — identity lasts for this session only
  }
  return device;
}

export function setDeviceLabel(label: string): DeviceInfo {
  const device = { ...getDevice(), label: label.trim().slice(0, 80) || guessLabel() };
  try {
    localStorage.setItem(KEY, JSON.stringify(device));
  } catch {
    // ignore
  }
  return device;
}
