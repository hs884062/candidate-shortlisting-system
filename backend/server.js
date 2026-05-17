const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
console.log("API KEY:", process.env.OPENROUTER_API_KEY);
const candidatesRouter = require("./routes/candidates");
const matchRouter = require("./routes/match");
const aiRouter = require("./routes/ai");

const app = express();

const corsOptions = {
	origin: "*"
};
app.use(cors(corsOptions));
app.use(express.json());

// Avoid hanging requests when MongoDB is down.
mongoose.set("bufferCommands", false);
mongoose.set("bufferTimeoutMS", 2000);

const mongoUri = process.env.MONGO_URI;
let mongoState = {
	configured: Boolean(mongoUri),
	connected: false,
	lastError: null,
	lastAttemptAt: null
};

async function connectMongoWithRetry() {
	if (!mongoUri) {
		mongoState = { ...mongoState, configured: false, connected: false };
		console.warn("MongoDB not configured (missing MONGO_URI). DB-backed routes will return 503.");
		return;
	}

	if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) return;

	mongoState.lastAttemptAt = new Date().toISOString();
	try {
		await mongoose.connect(mongoUri, {
			serverSelectionTimeoutMS: 5000
		});
		mongoState = { ...mongoState, configured: true, connected: true, lastError: null };
		console.log("MongoDB Connected");
	} catch (err) {
		mongoState = { ...mongoState, configured: true, connected: false, lastError: err?.message || String(err) };
		console.error("MongoDB connection error:", err?.message || err);
		setTimeout(connectMongoWithRetry, 10000);
	}
}

mongoose.connection.on("connected", () => {
	mongoState = { ...mongoState, connected: true, lastError: null };
});

mongoose.connection.on("disconnected", () => {
	mongoState = { ...mongoState, connected: false };
	setTimeout(connectMongoWithRetry, 10000);
});

mongoose.connection.on("error", (err) => {
	mongoState = { ...mongoState, connected: false, lastError: err?.message || String(err) };
});

connectMongoWithRetry();

function requireMongo(req, res, next) {
	if (mongoose.connection.readyState !== 1) {
		return res.status(503).json({
			error: "DatabaseUnavailable",
			message: mongoState.configured
				? "MongoDB is not connected. Check MONGO_URI / network access and try again."
				: "MongoDB is not configured. Set MONGO_URI in backend/.env."
		});
	}
	return next();
}

app.get("/", (req, res) => {
	res.send("Server Running");
});

app.use("/api/candidates", requireMongo, candidatesRouter);
app.use("/api/match", requireMongo, matchRouter);
app.use("/api/ai", requireMongo, aiRouter);

if (process.env.NODE_ENV === "production") {
	const distPath = path.join(__dirname, "..", "frontend", "dist");

	app.use(express.static(distPath));

	app.get("/", (req, res) => {
		res.sendFile(path.join(distPath, "index.html"));
	});
}

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
	const status = err?.statusCode || 500;
	return res.status(status).json({
		error: err?.name || "ServerError",
		message: err?.message || "Something went wrong"
	});
});

process.on("unhandledRejection", (reason) => {
	console.error("Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (err) => {
	console.error("Uncaught exception:", err);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
	console.log(`Server running on ${PORT}`);
});
