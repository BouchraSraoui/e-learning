import { apiServices } from './api';
import { API_URL } from './http';

// The platform talks to the real backend and nothing else. The in-memory
// demo/mock service layer was deleted deliberately (17 Jul 2026): a build with
// no API URL used to fall back to it silently and serve fake data (fake
// `ICO-MOCK-…` certificates, nothing persisted), which repeatedly got mistaken
// for the real product. There is no longer any mock to fall back TO, and no env
// var that can bring one back — a misconfigured build fails loudly here instead.
if (!API_URL) {
  throw new Error(
    'NEXT_PUBLIC_API_URL is not set. The frontend has no demo/offline mode — it ' +
      'requires a running backend. Copy frontend/.env.example to .env.local and point ' +
      'NEXT_PUBLIC_API_URL at your API (e.g. http://localhost:8000/api). ' +
      'Note NEXT_PUBLIC_* is inlined at build time, so it must be set when you build, not just at run.',
  );
}

export const services = apiServices;
