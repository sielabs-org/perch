import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { quizRouter } from './routes/quizzes.js';
import { registerSocketHandlers } from './game/socket.js';
import { loadQuizzes } from './store/quizStore.js';
import { sessionManager } from './game/sessionManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 4000;

loadQuizzes();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));
app.use('/api/quizzes', quizRouter);

/** Lets the join screen validate a code before asking for a nickname. */
app.get('/api/sessions/:code', (req, res) => {
  const session = sessionManager.get(req.params.code);
  if (!session) return res.status(404).json({ error: 'No session with that code' });
  res.json({
    code: session.code,
    title: session.quiz.title,
    emoji: session.quiz.emoji,
    phase: session.phase,
    playerCount: session.players.size,
  });
});

// Serve the built client when it exists, so `npm start` runs the whole product.
const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, methods: ['GET', 'POST'] },
});
registerSocketHandlers(io);

server.listen(PORT, () => {
  console.log(`QuizDeck server listening on http://localhost:${PORT}`);
});
