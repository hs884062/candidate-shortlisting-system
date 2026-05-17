const express = require("express");
const Candidate = require("../models/candidate");
const { matchCandidates } = require("../utils/matchCandidates");

const router = express.Router();

router.post("/", async (req, res, next) => {
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

		const candidates = await Candidate.find({ experience: { $gte: minExp } })
			.sort({ createdAt: -1 })
			.lean();

		const ranked = matchCandidates(candidates, {
			requiredSkills,
			preferredSkills: Array.isArray(preferredSkills) ? preferredSkills : [],
			minExperience: minExp
		});

		return res.json({
			job: { requiredSkills, preferredSkills: preferredSkills ?? [], minExperience: minExp },
			count: ranked.length,
			ranked
		});
	} catch (err) {
		return next(err);
	}
});

module.exports = router;
