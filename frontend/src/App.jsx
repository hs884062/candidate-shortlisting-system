import { useEffect, useMemo, useState } from 'react'
import './App.css'

import { addCandidate, aiShortlist, basicMatch, deleteCandidate, getCandidates, updateCandidate } from './api'

function parseSkills(text) {
  if (!text) return []
  return text
    .split(/[,\n]/g)
    .map((s) => s.trim())
    .filter(Boolean)
}

function percent(n) {
  if (!Number.isFinite(n)) return ''
  return `${n}%`
}

function formatSkillList(skills) {
  if (!Array.isArray(skills) || skills.length === 0) return '(none)'
  return skills.join(', ')
}

function App() {
  const [candidates, setCandidates] = useState([])
  const [candidatesLoading, setCandidatesLoading] = useState(false)
  const [candidatesError, setCandidatesError] = useState('')

  const [candidateForm, setCandidateForm] = useState({
    name: '',
    email: '',
    skillsText: '',
    experience: 0,
    bio: '',
    projects: '',
  })
  const [editingId, setEditingId] = useState(null)
  const [addStatus, setAddStatus] = useState({ loading: false, error: '', ok: '' })
  const [deleteStatus, setDeleteStatus] = useState({ loadingId: null, error: '' })

  const [jobForm, setJobForm] = useState({
    requiredSkillsText: '',
    preferredSkillsText: '',
    minExperience: 0,
  })
  const [matchStatus, setMatchStatus] = useState({ loading: false, error: '' })
  const [aiStatus, setAiStatus] = useState({ loading: false, error: '' })

  const [basicResult, setBasicResult] = useState(null)
  const [aiResult, setAiResult] = useState(null)

  const byEmail = useMemo(() => {
    const map = new Map()
    for (const c of candidates) {
      if (c?.email) map.set(c.email, c)
    }
    return map
  }, [candidates])

  async function refreshCandidates() {
    setCandidatesLoading(true)
    setCandidatesError('')
    try {
      const data = await getCandidates()
      setCandidates(Array.isArray(data) ? data : [])
    } catch (e) {
      setCandidatesError(e?.message || 'Failed to load candidates')
    } finally {
      setCandidatesLoading(false)
    }
  }

  useEffect(() => {
    // This effect syncs state with an external system (the backend API).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshCandidates()
  }, [])

  async function onAddCandidate(e) {
    e.preventDefault()
    setAddStatus({ loading: true, error: '', ok: '' })
    try {
      const payload = {
        name: candidateForm.name.trim(),
        email: candidateForm.email.trim(),
        skills: parseSkills(candidateForm.skillsText),
        experience: Number(candidateForm.experience),
        bio: candidateForm.bio,
        projects: candidateForm.projects,
      }

      if (editingId) {
        await updateCandidate(editingId, payload)
        setAddStatus({ loading: false, error: '', ok: 'Candidate updated.' })
      } else {
        await addCandidate(payload)
        setAddStatus({ loading: false, error: '', ok: 'Candidate added.' })
      }

      setCandidateForm({ name: '', email: '', skillsText: '', experience: 0, bio: '', projects: '' })
      setEditingId(null)
      await refreshCandidates()
    } catch (e2) {
      setAddStatus({ loading: false, error: e2?.message || 'Failed to add candidate', ok: '' })
    }
  }

  function onEditCandidate(candidate) {
    setCandidateForm({
      name: candidate?.name || '',
      email: candidate?.email || '',
      skillsText: Array.isArray(candidate?.skills) ? candidate.skills.join(', ') : '',
      experience: Number.isFinite(candidate?.experience) ? candidate.experience : 0,
      bio: candidate?.bio || '',
      projects: candidate?.projects || '',
    })
    setEditingId(candidate?._id || null)
    setAddStatus({ loading: false, error: '', ok: '' })
  }

  function onCancelEdit() {
    setCandidateForm({ name: '', email: '', skillsText: '', experience: 0, bio: '', projects: '' })
    setEditingId(null)
    setAddStatus({ loading: false, error: '', ok: '' })
  }

  async function onDeleteCandidate(id) {
    if (!id) return
    const ok = window.confirm('Delete this candidate?')
    if (!ok) return
    setDeleteStatus({ loadingId: id, error: '' })
    try {
      await deleteCandidate(id)
      await refreshCandidates()
    } catch (e3) {
      setDeleteStatus({ loadingId: null, error: e3?.message || 'Failed to delete candidate' })
      return
    } finally {
      setDeleteStatus((s) => ({ ...s, loadingId: null }))
    }
  }

  function buildJobPayload() {
    return {
      requiredSkills: parseSkills(jobForm.requiredSkillsText),
      preferredSkills: parseSkills(jobForm.preferredSkillsText),
      minExperience: Number(jobForm.minExperience),
    }
  }

  async function onBasicMatch(e) {
    e.preventDefault()
    setMatchStatus({ loading: true, error: '' })
    setAiStatus((s) => ({ ...s, error: '' }))
    try {
      const job = buildJobPayload()
      const res = await basicMatch(job)
      setBasicResult(res)
      setAiResult(null)
    } catch (e2) {
      setMatchStatus({ loading: false, error: e2?.message || 'Basic match failed' })
      return
    } finally {
      setMatchStatus((s) => ({ ...s, loading: false }))
    }
  }

  async function onAiShortlist(e) {
    e.preventDefault()
    setAiStatus({ loading: true, error: '' })
    setMatchStatus((s) => ({ ...s, error: '' }))
    try {
      const job = buildJobPayload()
      const res = await aiShortlist(job)
      setBasicResult(res?.basic ? { ...res.basic, job: res.job } : null)
      setAiResult(res?.ai ?? null)
    } catch (e2) {
      setAiStatus({ loading: false, error: e2?.message || 'AI shortlist failed' })
      return
    } finally {
      setAiStatus((s) => ({ ...s, loading: false }))
    }
  }

  return (
    <div className="app">
      <header className="appHeader">
        <h1>Candidate Shortlisting System</h1>
        <p className="muted">Add candidates, run skill-based matching, and optionally ask OpenRouter to rank candidates with explanations.</p>
      </header>

      <main className="grid">
        <section className="card">
          <h2>{editingId ? 'Edit Candidate' : 'Add Candidate'}</h2>
          <form onSubmit={onAddCandidate} className="form">
            <label className="field">
              <span>Name</span>
              <input
                className="input"
                value={candidateForm.name}
                onChange={(e) => setCandidateForm((s) => ({ ...s, name: e.target.value }))}
                required
              />
            </label>

            <label className="field">
              <span>Email</span>
              <input
                className="input"
                type="email"
                value={candidateForm.email}
                onChange={(e) => setCandidateForm((s) => ({ ...s, email: e.target.value }))}
                required
              />
            </label>

            <label className="field">
              <span>Skills (comma or newline separated)</span>
              <textarea
                className="input"
                rows={3}
                value={candidateForm.skillsText}
                onChange={(e) => setCandidateForm((s) => ({ ...s, skillsText: e.target.value }))}
                required
              />
            </label>

            <label className="field">
              <span>Experience (years)</span>
              <input
                className="input"
                type="number"
                min={0}
                step={1}
                value={candidateForm.experience}
                onChange={(e) => setCandidateForm((s) => ({ ...s, experience: e.target.value }))}
                required
              />
            </label>

            <label className="field">
              <span>Projects (optional)</span>
              <textarea
                className="input"
                rows={2}
                value={candidateForm.projects}
                onChange={(e) => setCandidateForm((s) => ({ ...s, projects: e.target.value }))}
              />
            </label>

            <label className="field">
              <span>Bio (optional)</span>
              <textarea
                className="input"
                rows={2}
                value={candidateForm.bio}
                onChange={(e) => setCandidateForm((s) => ({ ...s, bio: e.target.value }))}
              />
            </label>

            {addStatus.error ? <div className="error">{addStatus.error}</div> : null}
            {addStatus.ok ? <div className="ok">{addStatus.ok}</div> : null}

            <div className="buttons">
              <button className="button" type="submit" disabled={addStatus.loading}>
                {addStatus.loading ? (editingId ? 'Updating…' : 'Adding…') : editingId ? 'Update Candidate' : 'Add Candidate'}
              </button>
              {editingId ? (
                <button className="button secondary" type="button" onClick={onCancelEdit} disabled={addStatus.loading}>
                  Cancel Edit
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="card">
          <div className="cardHeader">
            <h2>Candidates</h2>
            <button className="button secondary" type="button" onClick={refreshCandidates} disabled={candidatesLoading}>
              {candidatesLoading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {candidatesError ? <div className="error">{candidatesError}</div> : null}
          {deleteStatus.error ? <div className="error">{deleteStatus.error}</div> : null}
          <div className="listMeta muted">{candidates.length} total</div>

          <div className="list">
            {candidates.length === 0 ? (
              <div className="muted">No candidates yet.</div>
            ) : (
              <ul className="items">
                {candidates.map((c) => (
                  <li key={c._id || c.email} className="item">
                    <div className="itemTitle">
                      <strong>{c.name}</strong> <span className="muted">({c.email})</span>
                    </div>
                    <div className="muted">
                      Experience: {c.experience} yrs · Skills: {formatSkillList(c.skills)}
                    </div>
                    <div className="buttons">
                      <button className="button secondary" type="button" onClick={() => onEditCandidate(c)}>
                        Edit
                      </button>
                      <button
                        className="button"
                        type="button"
                        onClick={() => onDeleteCandidate(c._id)}
                        disabled={deleteStatus.loadingId === c._id}
                      >
                        {deleteStatus.loadingId === c._id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="card">
          <h2>Job Requirements</h2>
          <form className="form">
            <label className="field">
              <span>Required skills</span>
              <textarea
                className="input"
                rows={2}
                value={jobForm.requiredSkillsText}
                onChange={(e) => setJobForm((s) => ({ ...s, requiredSkillsText: e.target.value }))}
                placeholder="React, Node.js"
              />
            </label>

            <label className="field">
              <span>Preferred skills</span>
              <textarea
                className="input"
                rows={2}
                value={jobForm.preferredSkillsText}
                onChange={(e) => setJobForm((s) => ({ ...s, preferredSkillsText: e.target.value }))}
                placeholder="MongoDB, AWS"
              />
            </label>

            <label className="field">
              <span>Minimum experience (years)</span>
              <input
                className="input"
                type="number"
                min={0}
                step={1}
                value={jobForm.minExperience}
                onChange={(e) => setJobForm((s) => ({ ...s, minExperience: e.target.value }))}
              />
            </label>

            {matchStatus.error ? <div className="error">{matchStatus.error}</div> : null}
            {aiStatus.error ? <div className="error">{aiStatus.error}</div> : null}

            <div className="buttons">
              <button className="button secondary" type="button" onClick={onBasicMatch} disabled={matchStatus.loading || aiStatus.loading}>
                {matchStatus.loading ? 'Matching…' : 'Basic Match'}
              </button>
              <button className="button" type="button" onClick={onAiShortlist} disabled={aiStatus.loading || matchStatus.loading}>
                {aiStatus.loading ? 'Shortlisting…' : 'AI Shortlist'}
              </button>
            </div>
          </form>
        </section>

        <section className="card">
          <h2>Shortlisted Candidates</h2>

          {!basicResult && !aiResult ? (
            <div className="muted">Run “Basic Match” or “AI Shortlist” to see results.</div>
          ) : null}

          {basicResult?.ranked ? (
            <div className="resultBlock">
              <h3>Basic Ranking</h3>
              <div className="muted">
                Count: {basicResult.count ?? basicResult.ranked.length}
              </div>
              <ol className="ranked">
                {basicResult.ranked.map((c) => (
                  <li key={c._id || c.email} className="rankedItem">
                    <div className="itemTitle">
                      <strong>{c.name}</strong> <span className="muted">({c.email})</span>
                    </div>
                    <div className="muted">
                      Match: {percent(c.matchScorePercent)} · Band: {c.matchBand} · Experience: {c.experience} yrs
                    </div>
                    <div className="muted">
                      Matched required: {formatSkillList(c.matchedRequiredSkills)}
                    </div>
                    {Array.isArray(c.matchedPreferredSkills) && c.matchedPreferredSkills.length > 0 ? (
                      <div className="muted">Matched preferred: {formatSkillList(c.matchedPreferredSkills)}</div>
                    ) : null}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {aiResult?.ranked ? (
            <div className="resultBlock">
              <h3>AI Ranking</h3>
              {aiResult.notes ? <div className="muted">{aiResult.notes}</div> : null}
              <ol className="ranked">
                {aiResult.ranked.map((r) => {
                  const meta = byEmail.get(r.email)
                  return (
                    <li key={r.email} className="rankedItem">
                      <div className="itemTitle">
                        <strong>{meta?.name || r.email}</strong> <span className="muted">({r.email})</span>
                      </div>
                      <div className="muted">AI score: {Number.isFinite(r.score) ? r.score : ''}</div>
                      <div>{r.reason}</div>
                    </li>
                  )
                })}
              </ol>
            </div>
          ) : null}
        </section>
      </main>

      <footer className="footer muted">
        Backend: <code>http://localhost:5000</code> · Frontend: <code>http://localhost:5173</code>
      </footer>
    </div>
  )
}

export default App
