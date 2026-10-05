let installPrompt = null;
let installed = false;
const listeners = new Set();
const notify = () => listeners.forEach(listener => listener());
let initialized = false;

export const subscribeInstall = listener => { listeners.add(listener); return () => listeners.delete(listener); };
export const getInstallState = () => installed ? 'installed' : installPrompt ? 'available' : 'help';

export async function promptInstall() {
  const prompt = installPrompt;
  if (!prompt) return 'unavailable';
  installPrompt = null;
  notify();
  try {
    await prompt.prompt();
    const choice = await prompt.userChoice;
    return choice.outcome;
  } catch {
    return 'unavailable';
  }
}

export function initializePwa() {
  if (initialized) return;
  initialized = true;
  const mode = window.matchMedia('(display-mode: standalone)');
  const updateMode = () => { installed = mode.matches || navigator.standalone === true; notify(); };
  updateMode();
  mode.addEventListener('change', updateMode);
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    installPrompt = null;
    notify();
  });

  if (!import.meta.env.PROD || !window.isSecureContext || !('serviceWorker' in navigator)) return;
  const register = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
      // No reload while a customer is filling an order. Navigation stays network-only.
      const update = () => registration.update().catch(() => {});
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') update(); });
      window.addEventListener('online', update);
    } catch (error) {
      console.warn('App installation is unavailable:', error);
    }
  };
  if (document.readyState === 'complete') void register();
  else window.addEventListener('load', register, { once: true });
}
