// Prompt delivery. On a phone the prompts have to survive a locked screen, so
// they go out as OS notifications with their buttons attached; in a browser they
// stay as in-app banners. The autopilot does not know the difference.

const ACTION_TYPES = [
  {
    id: 'autopilot-start',
    actions: [
      { id: 'start-now', title: 'Start now' },
      { id: 'start-cancel', title: 'Not now', destructive: true },
    ],
  },
  {
    id: 'autopilot-stop',
    actions: [
      { id: 'stop-now', title: 'Stop now' },
      { id: 'stop-keep', title: 'Keep running', destructive: true },
    ],
  },
];

const isNative = () =>
  typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.();

let plugin = null;
let nextId = 1;

export async function initNotifications(onAction) {
  if (!isNative()) return false;

  const mod = await import('@capacitor/local-notifications');
  plugin = mod.LocalNotifications;

  const { display } = await plugin.requestPermissions();
  if (display !== 'granted') return false;

  await plugin.registerActionTypes({ types: ACTION_TYPES });
  await plugin.addListener('localNotificationActionPerformed', event => {
    // `tap` means the body was tapped rather than a button; opening the app is
    // answer enough on its own, so leave the sequence running.
    if (event.actionId && event.actionId !== 'tap') onAction(event.actionId);
  });

  return true;
}

// Returns true when the prompt went out as a real notification, so the caller
// knows whether it still needs to draw a banner.
export async function deliver(note) {
  if (!plugin) return false;

  const actionTypeId = note.actions
    ? (note.id === 'start' ? 'autopilot-start' : 'autopilot-stop')
    : undefined;

  await plugin.schedule({
    notifications: [{
      id: nextId++,
      title: note.title,
      body: note.body,
      actionTypeId,
      ongoing: false,
      autoCancel: true,
    }],
  });

  return true;
}
