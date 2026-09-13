/**
 * Where the API lives.
 *
 * This used to be a hardcoded `http://localhost:8080`, which broke the moment anyone
 * tried to open the app from a phone or tablet on the same network: `localhost` on that
 * device means the device itself, not the Mac running the backend, so every request
 * failed with a connection error before it left the browser.
 *
 * Deriving it from the page's own hostname fixes that with no configuration - open the
 * app as `localhost:3000` and it calls `localhost:8080`; open it as `192.168.1.50:3000`
 * from a phone and it calls `192.168.1.50:8080`, because that is where the phone's
 * browser actually got the page from.
 *
 * REACT_APP_API_URL overrides this outright, which is what cloud hosting needs: point
 * it at a real domain (https://api.example.com) at build time and the fallback below
 * never runs. React only exposes env vars prefixed REACT_APP_, and only the ones
 * present when `npm run build` ran - setting one after the build has no effect.
 */
export const API_BASE_URL =
  process.env.REACT_APP_API_URL || `http://${window.location.hostname}:8080`;
