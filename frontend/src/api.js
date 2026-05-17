const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://candidate-shortlisting-system-k4jm.onrender.com"

async function requestJson(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }

  if (!res.ok) {
    const message =
      (data && typeof data === "object" && data.message) ||
      (typeof data === "string" && data) ||
      `Request failed: ${res.status}`
    const err = new Error(message)
    err.status = res.status
    err.data = data
    throw err
  }

  return data
}

export function getCandidates() {
  return requestJson("/api/candidates")
}

export function addCandidate(candidate) {
  return requestJson("/api/candidates", { method: "POST", body: candidate })
}

export function updateCandidate(id, candidate) {
  return requestJson(`/api/candidates/${id}`, { method: "PUT", body: candidate })
}

export function deleteCandidate(id) {
  return requestJson(`/api/candidates/${id}`, { method: "DELETE" })
}

export function basicMatch(job) {
  return requestJson("/api/match", { method: "POST", body: job })
}

export function aiShortlist(job) {
  return requestJson("/api/ai/shortlist", { method: "POST", body: job })
}
