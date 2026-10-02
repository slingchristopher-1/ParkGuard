// Movement source. One interface, two implementations:
//
//   native  @capacitor-community/background-geolocation — keeps reporting with
//           the app closed, which is the only way the autopilot can act on a
//           stop you made twenty minutes after locking your phone.
//   web     navigator.geolocation — foreground only; a browser gets nothing
//           once the tab is gone. Good enough to try the app, not to rely on.
//
// Both report the same shape: { speedKmh, lat, lon }.

const isNative = () =>
  typeof window !== 'undefined' &&
  !!window.Capacitor?.isNativePlatform?.();

export function platform() {
  return isNative() ? (window.Capacitor.getPlatform?.() || 'native') : 'web';
}

export async function watchMovement(onSample, onError = () => {}) {
  return isNative() ? watchNative(onSample, onError) : watchWeb(onSample, onError);
}

async function watchNative(onSample, onError) {
  // The plugin ships native code and typings only — no JS entry point — so it
  // is reached through Capacitor's runtime registry rather than imported.
  const { registerPlugin } = await import('@capacitor/core');
  const BackgroundGeolocation = registerPlugin('BackgroundGeolocation');

  const id = await BackgroundGeolocation.addWatcher(
    {
      // Android shows this while the watcher runs; it is required by the OS and
      // is also the honest thing to show, so say what it is for.
      backgroundMessage: 'Watching for when you park and drive off.',
      backgroundTitle: 'Parking autopilot',
      requestPermissions: true,
      stale: false,
      distanceFilter: 10,
    },
    (location, error) => {
      if (error) { onError(error); return; }
      onSample({
        speedKmh: msToKmh(location.speed),
        lat: location.latitude,
        lon: location.longitude,
      });
    }
  );

  return () => BackgroundGeolocation.removeWatcher({ id });
}

function watchWeb(onSample, onError) {
  if (!navigator.geolocation) { onError(new Error('no geolocation')); return () => {}; }

  let last = null;
  const id = navigator.geolocation.watchPosition(
    pos => {
      const { latitude: lat, longitude: lon, speed } = pos.coords;
      // Not every device reports speed, so derive it when it is missing.
      let kmh = msToKmh(speed);
      if (kmh === null && last) {
        const dt = (pos.timestamp - last.t) / 1000;
        if (dt > 0) kmh = msToKmh(metres(last.lat, last.lon, lat, lon) / dt);
      }
      last = { lat, lon, t: pos.timestamp };
      onSample({ speedKmh: kmh ?? 0, lat, lon });
    },
    onError,
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
  );

  return () => navigator.geolocation.clearWatch(id);
}

function msToKmh(speed) {
  return speed === null || speed === undefined || Number.isNaN(speed)
    ? null
    : Math.max(0, speed * 3.6);
}

function metres(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const rad = d => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
