const BASE_URL = import.meta.env.VITE_LOCAL_API_URL || 'http://localhost:3000';
const TIMEOUT_MS = 10000;

async function request(endpoint, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${BASE_URL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;

  const config = {
    ...options,
    signal: controller.signal,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    clearTimeout(timeoutId);

    let data = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const error = new Error(`HTTP error! status: ${response.status}`);
      error.response = { status: response.status, data };
      throw error;
    }

    return { data, status: response.status, headers: response.headers };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

const apiClient = {
  get: (endpoint, config = {}) => request(endpoint, { ...config, method: 'GET' }),
  post: (endpoint, body, config = {}) =>
    request(endpoint, {
      ...config,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  put: (endpoint, body, config = {}) =>
    request(endpoint, {
      ...config,
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: (endpoint, body, config = {}) =>
    request(endpoint, {
      ...config,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: (endpoint, config = {}) => request(endpoint, { ...config, method: 'DELETE' }),
};

export default apiClient;
