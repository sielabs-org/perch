import { Session } from './session.js';
import type { Quiz } from '../types.js';

const SESSION_TTL_MS = 1000 * 60 * 60 * 6; // reap abandoned rooms after 6h

export class SessionManager {
  private sessions = new Map<string, Session>();
  private onChange: (s: Session) => void = () => {};

  constructor() {
    setInterval(() => this.reap(), 1000 * 60 * 10).unref?.();
  }

  setChangeHandler(fn: (s: Session) => void) {
    this.onChange = fn;
  }

  private freshCode(): string {
    for (let i = 0; i < 500; i++) {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      if (!this.sessions.has(code)) return code;
    }
    throw new Error('Could not allocate a join code');
  }

  create(quiz: Quiz): Session {
    const session = new Session(this.freshCode(), quiz, (s) => this.onChange(s));
    this.sessions.set(session.code, session);
    return session;
  }

  get(code: string): Session | undefined {
    return this.sessions.get(code?.trim());
  }

  end(code: string) {
    const s = this.sessions.get(code);
    s?.dispose();
    this.sessions.delete(code);
  }

  private reap() {
    const cutoff = Date.now() - SESSION_TTL_MS;
    for (const [code, s] of this.sessions) {
      if (s.lastActivity < cutoff) {
        s.dispose();
        this.sessions.delete(code);
      }
    }
  }
}

export const sessionManager = new SessionManager();
