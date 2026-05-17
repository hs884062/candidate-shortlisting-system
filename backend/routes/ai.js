const express = require("express");
const Candidate = require("../models/candidate");
const { matchCandidates } = require("../utils/matchCandidates");
const { aiShortlist } = require("../services/openrouter");

const router = express.Router();

router.post("/shortlist", async (req, res, next) => {
	try {
		const { requiredSkills, preferredSkills, minExperience } = req.body || {};
		if (!Array.isArray(requiredSkills)) {
			return res.status(400).json({
				error: "ValidationError",
				message: "requiredSkills must be an array"
			});
		}

		const minExp = Number(minExperience ?? 0);
		if (!Number.isFinite(minExp) || minExp < 0) {
			return res.status(400).json({
				error: "ValidationError",
				message: "minExperience must be a non-negative number"
			});
		}

		const candidates = await Candidate.find({}).sort({ createdAt: -1 }).lean();
		const basicRanked = matchCandidates(candidates, {
			requiredSkills,
			preferredSkills: Array.isArray(preferredSkills) ? preferredSkills : [],
			minExperience: minExp
		});

		// Provide the AI with already-computed match info to improve reasoning.
		const aiInput = basicRanked.map((c) => ({
			name: c.name,
			email: c.email,
			skills: c.skills,
			experience: c.experience,
			bio: c.bio,
			projects: c.projects,
			matchScorePercent: c.matchScorePercent,
			matchedRequiredSkills: c.matchedRequiredSkills,
			matchedPreferredSkills: c.matchedPreferredSkills,
			matchBand: c.matchBand
		}));

		const aiResult = await aiShortlist({
			apiKey: process.env.OPENROUTER_API_KEY,
			model: process.env.OPENROUTER_MODEL,
			job: {
				requiredSkills,
				preferredSkills: Array.isArray(preferredSkills) ? preferredSkills : [],
				minExperience: minExp
			},
			candidates: aiInput
		});

		return res.json({
			job: { requiredSkills, preferredSkills: preferredSkills ?? [], minExperience: minExp },
			basic: {
				count: basicRanked.length,
				ranked: basicRanked
			},
			ai: aiResult
		});
	} catch (err) {
		return next(err);
	}
});

module.exports = router;
