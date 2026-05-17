const mongoose = require("mongoose");

const CandidateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        unique: true
    },
    skills: {
        type: [String],
        required: true,
        default: [],
        set: (skills) => {
            if (!Array.isArray(skills)) return [];
            return skills
                .map((s) => String(s).trim())
                .filter(Boolean);
        }
    },
    experience: {
        type: Number,
        required: true,
        min: 0
    },
    projects: {
        type: String,
        default: "",
        trim: true
    },
    bio: {
        type: String,
        default: "",
        trim: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Candidate", CandidateSchema);