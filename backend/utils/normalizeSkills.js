function normalizeSkill(skill) {
	return String(skill || "")
		.trim()
		.replace(/\s+/g, " ")
		.toLowerCase();
}

function normalizeSkills(skills) {
	if (!Array.isArray(skills)) return [];
	const seen = new Set();
	const normalized = [];
	for (const skill of skills) {
		const s = normalizeSkill(skill);
		if (!s) continue;
		if (seen.has(s)) continue;
		seen.add(s);
		normalized.push(s);
	}
	return normalized;
}

module.exports = {
	normalizeSkill,
	normalizeSkills
};
