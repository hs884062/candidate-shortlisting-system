const express = require("express");
const Candidate = require("../models/candidate");

const router = express.Router();

router.post("/", async (req, res, next) => {
	try {
		const { name, email, skills, experience, bio, projects } = req.body || {};

		if (!name || !email || !Array.isArray(skills) || typeof experience !== "number") {
			return res.status(400).json({
				error: "ValidationError",
				message: "name, email, skills (array), and experience (number) are required"
			});
		}

		const candidate = await Candidate.create({
			name,
			email,
			skills,
			experience,
			bio: bio ?? "",
			projects: projects ?? ""
		});

		return res.status(201).json(candidate);
	} catch (err) {
		// Duplicate email
		if (err?.code === 11000) {
			return res.status(409).json({
				error: "DuplicateEmail",
				message: "A candidate with this email already exists"
			});
		}
		return next(err);
	}
});

router.get("/", async (req, res, next) => {
	try {
		const candidates = await Candidate.find({}).sort({ createdAt: -1 }).lean();
		return res.json(candidates);
	} catch (err) {
		return next(err);
	}
});

router.put("/:id", async (req, res, next) => {
	try {
		const { name, email, skills, experience, bio, projects } = req.body || {};
		const update = {};

		if (name !== undefined) {
			if (!name) {
				return res.status(400).json({
					error: "ValidationError",
					message: "name must be a non-empty string"
				});
			}
			update.name = name;
		}

		if (email !== undefined) {
			if (!email) {
				return res.status(400).json({
					error: "ValidationError",
					message: "email must be a non-empty string"
				});
			}
			update.email = email;
		}

		if (skills !== undefined) {
			if (!Array.isArray(skills)) {
				return res.status(400).json({
					error: "ValidationError",
					message: "skills must be an array"
				});
			}
			update.skills = skills;
		}

		if (experience !== undefined) {
			const exp = Number(experience);
			if (!Number.isFinite(exp) || exp < 0) {
				return res.status(400).json({
					error: "ValidationError",
					message: "experience must be a non-negative number"
				});
			}
			update.experience = exp;
		}

		if (bio !== undefined) update.bio = bio;
		if (projects !== undefined) update.projects = projects;

		if (Object.keys(update).length === 0) {
			return res.status(400).json({
				error: "ValidationError",
				message: "No valid fields provided for update"
			});
		}

		const updated = await Candidate.findByIdAndUpdate(req.params.id, update, {
			new: true,
			runValidators: true,
			context: "query"
		});

		if (!updated) {
			return res.status(404).json({
				error: "NotFound",
				message: "Candidate not found"
			});
		}

		return res.json(updated);
	} catch (err) {
		if (err?.code === 11000) {
			return res.status(409).json({
				error: "DuplicateEmail",
				message: "A candidate with this email already exists"
			});
		}
		return next(err);
	}
});

router.delete("/:id", async (req, res, next) => {
	try {
		const deleted = await Candidate.findByIdAndDelete(req.params.id);
		if (!deleted) {
			return res.status(404).json({
				error: "NotFound",
				message: "Candidate not found"
			});
		}
		return res.json({ deleted: true, id: deleted._id });
	} catch (err) {
		return next(err);
	}
});

module.exports = router;
