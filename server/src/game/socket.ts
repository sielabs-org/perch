import type { Server, Socket } from 'socket.io';
import { sessionManager } from './sessionManager.js';
import { hostView, playerView } from './projection.js';
import type { Session } from './session.js';
import { quizStore } from '../store/quizStore.js';
import { quizProblems } from '../quizValidation.js';

interface SocketMeta {
  role?: 'host' | 'player';
  code?: string;
  playerId?: string;
}

const meta = new WeakMap<Socket, SocketMeta>();
const m = (s: Socket): SocketMeta => {
  let v = meta.get(s);
  if (!v) {
    v = {};
    meta.set(s, v);
  }
  return v;
};

export function registerSocketHandlers(io: Server) {
  const hostRoom = (code: string) => `host:${code}`;
  const playerRoom = (code: string) => `players:${code}`;

  function broadcast(session: Session) {
    io.to(hostRoom(session.code)).emit('session:state', hostView(session));
    for (const socket of io.sockets.adapter.rooms.get(playerRoom(session.code)) ?? []) {
      const s = io.sockets.sockets.get(socket);
      const pid = s && m(s).playerId;
      if (s && pid) s.emit('session:state', playerView(session, pid));
    }
  }

  sessionManager.setChangeHandler(broadcast);

  io.on('connection', (socket) => {
    // ---------------- host ----------------

    socket.on('host:create', ({ quizId }: { quizId: string }, ack) => {
      const quiz = quizStore.get(quizId);
      if (!quiz) return ack?.({ error: 'Quiz not found' });
      const problems = quizProblems(quiz);
      if (problems.length)
        return ack?.({ error: `This quiz isn’t ready to present. ${problems[0]}` });
      const session = sessionManager.create(quiz);
      session.hostSocketId = socket.id;
      Object.assign(m(socket), { role: 'host', code: session.code });
      socket.join(hostRoom(session.code));
      ack?.({ code: session.code, state: hostView(session) });
    });

    socket.on('host:resume', ({ code }: { code: string }, ack) => {
      const session = sessionManager.get(code);
      if (!session) return ack?.({ error: 'That session has ended' });
      session.hostSocketId = socket.id;
      Object.assign(m(socket), { role: 'host', code: session.code });
      socket.join(hostRoom(session.code));
      ack?.({ code: session.code, state: hostView(session) });
    });

    // Clients emit `(payload, ack)`, so the payload slot must be consumed even
    // when the action takes no arguments — otherwise the ack never fires.
    const hostAction =
      (fn: (s: Session) => void) =>
      (_payload: unknown, ack?: (r: unknown) => void) => {
      const { code, role } = m(socket);
      if (role !== 'host' || !code) return ack?.({ error: 'Not a host' });
      const session = sessionManager.get(code);
      if (!session) return ack?.({ error: 'Session ended' });
      fn(session);
      broadcast(session);
      ack?.({ ok: true });
    };

    socket.on('host:next', hostAction((s) => s.advance()));
    socket.on('host:back', hostAction((s) => s.back()));
    socket.on('host:skip', hostAction((s) => s.closeQuestion()));

    socket.on('host:kick', ({ playerId }: { playerId: string }, ack) => {
      const { code, role } = m(socket);
      if (role !== 'host' || !code) return ack?.({ error: 'Not a host' });
      const session = sessionManager.get(code);
      if (!session) return ack?.({ error: 'Session ended' });
      session.removePlayer(playerId);
      for (const sid of io.sockets.adapter.rooms.get(playerRoom(code)) ?? []) {
        const s = io.sockets.sockets.get(sid);
        if (s && m(s).playerId === playerId) {
          s.emit('session:kicked');
          s.leave(playerRoom(code));
        }
      }
      broadcast(session);
      ack?.({ ok: true });
    });

    socket.on('host:end', (_: unknown, ack?: (r: unknown) => void) => {
      const { code, role } = m(socket);
      if (role !== 'host' || !code) return ack?.({ error: 'Not a host' });
      io.to(playerRoom(code)).emit('session:ended');
      sessionManager.end(code);
      ack?.({ ok: true });
    });

    // ---------------- player ----------------

    socket.on(
      'player:join',
      (
        { code, name, playerId }: { code: string; name: string; playerId?: string },
        ack,
      ) => {
        const session = sessionManager.get(code);
        if (!session) return ack?.({ error: 'No session with that code' });

        const rejoining = playerId && session.players.has(playerId);
        const clean = (name ?? '').trim().slice(0, 20);
        if (!rejoining) {
          if (clean.length < 1) return ack?.({ error: 'Enter a nickname' });
          if (session.phase !== 'lobby')
            return ack?.({ error: 'This quiz has already started' });
          if (session.nameTaken(clean))
            return ack?.({ error: 'That nickname is taken' });
        }

        const player = session.addPlayer(clean, playerId);
        Object.assign(m(socket), { role: 'player', code: session.code, playerId: player.id });
        socket.join(playerRoom(session.code));
        ack?.({ playerId: player.id, state: playerView(session, player.id) });
        broadcast(session);
      },
    );

    socket.on('player:answer', ({ optionId }: { optionId: string }, ack) => {
      const { code, playerId } = m(socket);
      if (!code || !playerId) return ack?.({ error: 'Not in a session' });
      const session = sessionManager.get(code);
      if (!session) return ack?.({ error: 'Session ended' });
      const result = session.submitAnswer(playerId, optionId);
      ack?.({ result });
      broadcast(session);
    });

    socket.on('disconnect', () => {
      const { code, role, playerId } = m(socket);
      if (!code) return;
      const session = sessionManager.get(code);
      if (!session) return;
      if (role === 'player' && playerId) {
        const p = session.players.get(playerId);
        if (p) p.connected = false;
        // Players who never got past the lobby are dropped outright so the
        // roster doesn't fill with ghosts; mid-game players keep their score
        // so they can reconnect into the same seat.
        if (p && session.phase === 'lobby') session.removePlayer(playerId);
        broadcast(session);
      }
    });
  });
}
