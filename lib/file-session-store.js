const fs = require('fs');
const path = require('path');
const session = require('express-session');

class FileSessionStore extends session.Store {
  constructor(options = {}) {
    super();
    this.filePath = options.filePath || path.join(__dirname, '../data/sessions.json');
    this.ttlMs = Number(options.ttlMs || 8 * 60 * 60 * 1000);
    this.cleanupIntervalMs = Number(options.cleanupIntervalMs || 30 * 60 * 1000);

    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(this.filePath)) fs.writeFileSync(this.filePath, '{}', 'utf8');

    this.cleanupTimer = setInterval(() => this.cleanupExpiredSessions(), this.cleanupIntervalMs);
    if (typeof this.cleanupTimer.unref === 'function') this.cleanupTimer.unref();
  }

  readStore() {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8').trim();
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  }

  writeStore(data) {
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  getSessionExpiry(sess) {
    const cookieExpiry = sess?.cookie?.expires ? new Date(sess.cookie.expires).getTime() : null;
    const fallbackExpiry = Date.now() + this.ttlMs;
    return Number.isFinite(cookieExpiry) ? cookieExpiry : fallbackExpiry;
  }

  isExpired(record) {
    return !record || !record.expiresAt || record.expiresAt <= Date.now();
  }

  cleanupExpiredSessions() {
    const store = this.readStore();
    let changed = false;

    for (const sid of Object.keys(store)) {
      if (this.isExpired(store[sid])) {
        delete store[sid];
        changed = true;
      }
    }

    if (changed) this.writeStore(store);
  }

  get(sid, callback = () => {}) {
    try {
      const store = this.readStore();
      const record = store[sid];

      if (this.isExpired(record)) {
        if (record) {
          delete store[sid];
          this.writeStore(store);
        }
        return callback(null, null);
      }

      return callback(null, record.session);
    } catch (error) {
      return callback(error);
    }
  }

  set(sid, sess, callback = () => {}) {
    try {
      const store = this.readStore();
      store[sid] = {
        expiresAt: this.getSessionExpiry(sess),
        session: sess
      };
      this.writeStore(store);
      return callback(null);
    } catch (error) {
      return callback(error);
    }
  }

  destroy(sid, callback = () => {}) {
    try {
      const store = this.readStore();
      delete store[sid];
      this.writeStore(store);
      return callback(null);
    } catch (error) {
      return callback(error);
    }
  }

  touch(sid, sess, callback = () => {}) {
    try {
      const store = this.readStore();
      if (!store[sid]) return callback(null);
      store[sid].expiresAt = this.getSessionExpiry(sess);
      store[sid].session = sess;
      this.writeStore(store);
      return callback(null);
    } catch (error) {
      return callback(error);
    }
  }
}

module.exports = FileSessionStore;
