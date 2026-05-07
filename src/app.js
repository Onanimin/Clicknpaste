import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHealthRouter } from './routes/health.js';
import { createPastesApiRouter } from './routes/pastesApi.js';
import { createPastesPageRouter } from './routes/pastesPage.js';
import pastesListRouter from './routes/pastesList.js';
import { checkDatabaseConnection, consumePaste, createPaste, deletePaste } from './services/pasteService.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function renderHomePage() {
	return `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>Clicknpaste</title>
	<style>
		:root {
			--bg: #070707;
			--bg-soft: #111111;
			--panel: rgba(18, 18, 18, 0.94);
			--panel-2: #151515;
			--panel-3: #1c1c1c;
			--text: #f3efe8;
			--muted: #b6ad9f;
			--accent: #ff8a00;
			--accent-2: #ffb14d;
			--accent-3: #ffd199;
			--border: rgba(255, 138, 0, 0.18);
		}
		* { box-sizing: border-box; }
		body {
			margin: 0;
			min-height: 100vh;
			font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
			background:
				radial-gradient(circle at top left, rgba(255, 138, 0, 0.12), transparent 35%),
				radial-gradient(circle at top right, rgba(255, 177, 77, 0.08), transparent 28%),
				linear-gradient(180deg, #050505 0%, var(--bg) 100%);
			color: var(--text);
			padding: 32px 16px 48px;
		}
		body::before {
			content: '';
			position: fixed;
			inset: 0;
			pointer-events: none;
			background-image: linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
			background-size: 52px 52px;
			mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.55), transparent 90%);
		}
		main {
			position: relative;
			z-index: 1;
			max-width: 980px;
			margin: 0 auto;
			display: grid;
			gap: 20px;
		}
		.hero, .card {
			background: var(--panel);
			border: 1px solid var(--border);
			border-radius: 22px;
			box-shadow: 0 32px 90px rgba(0, 0, 0, 0.42);
		}
		.hero {
			padding: 30px;
			background: linear-gradient(180deg, rgba(255, 138, 0, 0.08), transparent 40%), var(--panel);
		}
		.badge {
			display: inline-flex;
			align-items: center;
			gap: 8px;
			padding: 6px 10px;
			border-radius: 999px;
			background: rgba(255, 138, 0, 0.12);
			color: var(--accent-3);
			border: 1px solid rgba(255, 138, 0, 0.22);
			font-size: 0.86rem;
			font-weight: 700;
			letter-spacing: 0.03em;
			text-transform: uppercase;
		}
		.hero h1 {
			margin: 14px 0 0;
			font-size: clamp(2.4rem, 5vw, 4.6rem);
			line-height: 0.95;
			letter-spacing: -0.05em;
		}
		.hero p { color: var(--muted); max-width: 68ch; line-height: 1.7; font-size: 1.03rem; }
		.hero .subline {
			display: flex;
			flex-wrap: wrap;
			gap: 10px;
			margin-top: 16px;
		}
		.chip {
			padding: 8px 12px;
			border-radius: 999px;
			background: rgba(255, 255, 255, 0.04);
			border: 1px solid rgba(255, 255, 255, 0.06);
			color: #e9dfcf;
			font-size: 0.9rem;
		}
		.card { padding: 26px; }
		label { display: block; margin-bottom: 10px; font-weight: 600; }
		textarea {
			width: 100%;
			min-height: 240px;
			resize: vertical;
			border: 1px solid rgba(255, 138, 0, 0.18);
			border-radius: 16px;
			background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent), var(--panel-2);
			color: var(--text);
			padding: 16px;
			font: inherit;
			outline: none;
			box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.02);
		}
		textarea:focus, input:focus {
			border-color: rgba(255, 177, 77, 0.7);
			box-shadow: 0 0 0 3px rgba(255, 138, 0, 0.14);
		}
		.grid {
			display: grid;
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 16px;
			margin-top: 16px;
		}
		input {
			width: 100%;
			border: 1px solid rgba(255, 138, 0, 0.18);
			border-radius: 12px;
			background: var(--panel-3);
			color: var(--text);
			padding: 12px 14px;
			font: inherit;
			outline: none;
		}
		button {
			margin-top: 18px;
			border: 0;
			border-radius: 14px;
			padding: 13px 18px;
			background: linear-gradient(135deg, var(--accent), var(--accent-2));
			color: #140d02;
			font-weight: 700;
			letter-spacing: 0.02em;
			cursor: pointer;
			box-shadow: 0 12px 28px rgba(255, 138, 0, 0.2);
		}
		button:hover { filter: brightness(1.04); }
		.result, .error {
			margin-top: 18px;
			padding: 14px 16px;
			border-radius: 14px;
			display: none;
			word-break: break-word;
		}
		.result { background: rgba(255, 138, 0, 0.12); border: 1px solid rgba(255, 177, 77, 0.35); }
		.error { background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.35); }
		.result a { color: var(--accent-3); }
		.help { color: var(--muted); font-size: 0.94rem; margin-top: 8px; }
		.kbd {
			display: inline-flex;
			align-items: center;
			padding: 3px 8px;
			border-radius: 8px;
			background: rgba(255, 255, 255, 0.06);
			border: 1px solid rgba(255, 255, 255, 0.08);
			font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
			font-size: 0.84rem;
		}
		@media (max-width: 720px) {
			.grid { grid-template-columns: 1fr; }
			.hero, .card { border-radius: 18px; }
		}
	</style>
</head>
<body>
	<main>
		<section class="hero">
			<div class="badge">Paste now</div>
			<h1>Clicknpaste</h1>
			<p>Create a text paste, optionally protect it with a password or view limit, and share the generated link.</p>
		</section>
		<section class="card">
			<form id="paste-form">
				<label for="content">Paste content</label>
				<textarea id="content" name="content" required placeholder="Paste your text here"></textarea>
				<div class="grid">
					<div>
						<label for="max_views">Max views</label>
						<input id="max_views" name="max_views" type="number" min="1" placeholder="Optional" />
					</div>
					<div>
						<label for="password">Password</label>
						<input id="password" name="password" type="password" minLength="4" placeholder="Optional (private paste)" />
					</div>
				</div>
				<button type="submit">Create paste</button>
				<p class="help">The result will be a shareable URL you can open in a new tab or send to someone else. If the database is not connected yet, the app will show a clear error instead of failing silently.</p>
				<div id="error" class="error"></div>
				<div id="result" class="result"></div>
			</form>
		</section>
		<section class="card">
			<h2>Recent pastes</h2>
			<div id="recent-list">Loading…</div>
		</section>
	</main>
	<script src="/home.js" defer></script>
</body>
</html>`;
}

export function createApp({
	checkDatabaseConnectionFn = checkDatabaseConnection,
	createPasteFn = createPaste,
	consumePasteFn = consumePaste,
	deletePasteFn = deletePaste
} = {}) {
	const app = express();

	app.disable('x-powered-by');
	app.set('trust proxy', true);
	app.use(helmet());
	app.use(express.json());
	app.use(express.static(path.join(__dirname, '..', 'public')));

	app.get('/', (request, response) => {
		response.status(200).type('html').send(renderHomePage());
	});

	app.use(createHealthRouter({ checkDatabaseConnection: checkDatabaseConnectionFn }));
	app.use(pastesListRouter);
	app.use(createPastesApiRouter({ createPaste: createPasteFn, consumePaste: consumePasteFn }));
	app.use(createPastesPageRouter({ consumePaste: consumePasteFn, deletePaste: deletePasteFn }));

	app.use(notFoundHandler);
	app.use(errorHandler);

	return app;
}

export default createApp();