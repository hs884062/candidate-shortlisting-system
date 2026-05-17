const { normalizeSkills } = require("./normalizeSkills");

function computeMatch({ candidateSkills, requiredSkills, preferredSkills }) {
	const cand = new Set(normalizeSkills(candidateSkills));
	const required = normalizeSkills(requiredSkills);
	const preferred = normalizeSkills(preferredSkills);

	const matchedRequired = required.filter((s) => cand.has(s));
	const matchedPreferred = preferred.filter((s) => cand.has(s));

	const requiredScore = required.length === 0 ? 0 : matchedRequired.length / required.length;
	const preferredScore = preferred.length === 0 ? 0 : matchedPreferred.length / preferred.length;

	// Weight required skills heavily; preferred is a tie-breaker.
	const matchScore = Math.max(0, Math.min(1, requiredScore * 0.9 + preferredScore * 0.1));

	let matchBand = "low";
	if (matchScore >= 0.75) matchBand = "high";
	else if (matchScore >= 0.4) matchBand = "medium";

	return {
		matchedRequiredSkills: matchedRequired,
		matchedPreferredSkills: matchedPreferred,
		requiredScore,
		preferredScore,
		matchScore,
		matchBand
	};
}

function matchCandidates(candidates, job) {
	const requiredSkills = job?.requiredSkills ?? [];
	const preferredSkills = job?.preferredSkills ?? [];

	return candidates
		.map((candidate) => {
			const match = computeMatch({
				candidateSkills: candidate.skills,
				requiredSkills,
				preferredSkills
			});

			return {
				...candidate,
				...match,
				matchScorePercent: Math.round(match.matchScore * 100)
			};
		})
		.sort((a, b) => {
			if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
			return (b.experience ?? 0) - (a.experience ?? 0);
		});
}

module.exports = {
	computeMatch,
	matchCandidates
};
