const API = {
  async request(path, options={}) {
    const res  = await fetch(path, { headers:{'Content-Type':'application/json'}, credentials:'same-origin', ...options });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  },
  get:    (path)       => API.request(path),
  delete: (path)       => API.request(path, { method:'DELETE' }),
  post:   (path, body) => API.request(path, { method:'POST',   body:JSON.stringify(body) }),
  put:    (path, body) => API.request(path, { method:'PUT',    body:JSON.stringify(body) }),
};
