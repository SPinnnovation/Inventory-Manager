const API_SUFFIX_RE = /\/api\/v1\/?$/;

function toWsProtocol(url) {
  return url.replace(/^https:\/\//, 'wss://').replace(/^http:\/\//, 'ws://');
}

export function getWebSocketUrl(path) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const explicitBase = import.meta.env.VITE_WS_BASE_URL;

  if (explicitBase) {
    return `${explicitBase.replace(/\/$/, '')}${normalizedPath}`;
  }

  const apiBase = import.meta.env.VITE_API_BASE_URL || '';
  if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
    return `${toWsProtocol(apiBase).replace(API_SUFFIX_RE, '')}${normalizedPath}`;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${normalizedPath}`;
}
