const BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

async function parseResponse(res) {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }

  const text = await res.text();
  return text ? { error: text } : {};
}

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  let res;

  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(`Could not reach the backend at ${BASE}. Make sure the API server is running.`);
  }

  const data = await parseResponse(res);
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// For multipart/form-data (file uploads) — let browser set Content-Type with boundary
async function requestForm(path, formData) {
  const token = localStorage.getItem('token');
  let res;

  try {
    res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData,
    });
  } catch {
    throw new Error(`Could not reach the backend at ${BASE}. Make sure the API server is running.`);
  }

  const data = await parseResponse(res);
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  get:      (path)            => request(path),
  post:     (path, body)      => request(path, { method: 'POST',   body: JSON.stringify(body) }),
  postForm: (path, formData)  => requestForm(path, formData),
  patch:    (path, body)      => request(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete:   (path)            => request(path, { method: 'DELETE' }),
};
