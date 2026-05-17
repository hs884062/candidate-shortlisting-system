const axios = require("axios");

function buildShortlistPrompt({ job, candidates }) {
	const requiredSkills = job?.requiredSkills?.join(", ") || "(none)";
	const preferredSkills = job?.preferredSkills?.join(", ") || "(none)";
	const minExperience = Number.isFinite(job?.minExperience) ? job.minExperience : 0;

	const formattedCandidates = candidates
		.map((c, idx) => {
			const skills = Array.isArray(c.skills) ? c.skills.join(", ") : "";
			const bio = c.bio ? ` Bio: ${c.bio}` : "";
			const projects = c.projects ? ` Projects: ${c.projects}` : "";
			return `${idx + 1}. ${c.name} (${c.email}) - Skills: ${skills} - Experience: ${c.experience} years.${bio}${projects}`;
		})
		.join("\n");

	return [
		"You are helping a recruiter shortlist candidates.",
		"Return ONLY valid JSON.",
		"\nJob requirements:",
		`- Required skills: ${requiredSkills}`,
		`- Preferred skills: ${preferredSkills}`,
		`- Minimum experience (years): ${minExperience}`,
		"\nCandidates:",
		formattedCandidates || "(no candidates)",
		"\nTask:",
		"- Rank the candidates from best to worst.",
		"- For each candidate, include a short explanation (1-3 sentences) focusing on fit.",
		"- If a candidate does not meet minimum experience, you may still include them but explain the risk.",
		"\nJSON schema:",
		"{",
		'  "ranked": [',
		'    { "email": string, "score": number (0-100), "reason": string }',
		"  ],",
		'  "notes": string',
		"}",
	].join("\n");
}

// ✅ Only ONE function declaration — no duplicate
async function aiShortlist({ apiKey, model, job, candidates }) {
	// Debug logs — inside the function ✅
	console.log("🔑 API Key exists:", !!apiKey);
	console.log("🤖 Model:", model || "meta-llama/llama-3.3-70b-instruct:free");
	console.log("👥 Candidates count:", candidates?.length);

	if (!apiKey) {
		const err = new Error("OPENROUTER_API_KEY is not set");
		err.statusCode = 500;
		throw err;
	}

	const prompt = buildShortlistPrompt({ job, candidates });

	let response;
	try {
	response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
			{
				model: model || "meta-llama/llama-3.3-70b-instruct:free",
				messages: [{ role: "user", content: prompt }],
			},
			{
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"Content-Type": "application/json",
					"HTTP-Referer": "http://localhost:3000",
					"X-Title": "Candidate Shortlisting App",
				},
			}
		);
	} catch (err) {
		const status = err?.response?.status;
		console.error("❌ OpenRouter error:", err?.response?.data); // shows exact reason
		const error = new Error(
			status
				? `OpenRouter request failed with status ${status}`
				: err?.message || "OpenRouter request failed"
		);
		error.statusCode = status || 502;
		error.details = err?.response?.data;
		throw error;
	}

	const content = response?.data?.choices?.[0]?.message?.content;
	if (!content) {
		const err = new Error("No AI response content returned");
		err.statusCode = 502;
		throw err;
	}

	// Try strict JSON parse first; fall back to extracting the first JSON object
	try {
		return JSON.parse(content);
	} catch {
		const start = content.indexOf("{");
		const end = content.lastIndexOf("}");
		if (start >= 0 && end > start) {
			const maybeJson = content.slice(start, end + 1);
			return JSON.parse(maybeJson);
		}
		throw new Error("AI response was not valid JSON");
	}
}

module.exports = { aiShortlist };