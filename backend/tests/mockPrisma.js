const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STORE_PATH = path.resolve(__dirname, '../../data', 'smartprint_store.json');

/**
 * In-Memory & File-Persistent Prisma Mock
 * Automatically preserves all users, shops, orders, and print files across server restarts and logouts
 */
class InMemoryPrisma {
  constructor() {
    this.users = [];
    this.shops = [];
    this.shopUsers = [];
    this._shopSettings = [];
    this.customerSessions = [];
    this.orders = [];
    this.orderFiles = [];
    this.printConfigurations = [];
    this.orderFileServices = [];
    this.additionalServices = [];
    this.pricingRules = [];
    this.printJobs = [];
    this.orderStatusLogs = [];
    this.notifications = [];
    this.payments = [];
    this.expiryLogs = [];
    this.printers = [];
    this.auditLogs = [];
    this.refreshTokens = [];
    this.emailOtps = [];
    this.fileEncryptions = [];
    this.seq = 1;

    this._loadFromDisk();

    this.user = this._createCollection('users');
    this.refreshToken = this._createCollection('refreshTokens');
    this.shop = this._createCollection('shops');
    this.shopUser = this._createCollection('shopUsers');
    this.shopSettings = this._createCollection('_shopSettings');
    this.customerSession = this._createCollection('customerSessions');
    this.order = this._createCollection('orders');
    this.orderFile = this._createCollection('orderFiles');
    this.printConfiguration = this._createCollection('printConfigurations');
    this.orderFileService = this._createCollection('orderFileServices');
    this.additionalService = this._createCollection('additionalServices');
    this.pricingRule = this._createCollection('pricingRules');
    this.printJob = this._createCollection('printJobs');
    this.orderStatusLog = this._createCollection('orderStatusLogs');
    this.notification = this._createCollection('notifications');
    this.payment = this._createCollection('payments');
    this.expiryLog = this._createCollection('expiryLogs');
    this.printer = this._createCollection('printers');
    this.auditLog = this._createCollection('auditLogs');
    this.emailOtp = this._createCollection('emailOtps');
    this.fileEncryption = this._createCollection('fileEncryptions');
    this.prisma = this;

    return new Proxy(this, {
      get(target, prop) {
        if (typeof prop === 'symbol') return target[prop];
        if (prop in target) return target[prop];
        if (prop.startsWith('$')) return target[prop];
        // Dynamic collection creation for any unmapped model
        const listKey = `_dyn_${prop}`;
        if (!target[listKey]) {
          target[listKey] = [];
        }
        target[prop] = target._createCollection(listKey);
        return target[prop];
      },
    });
  }

  async $transaction(fn) {
    if (typeof fn === 'function') {
      return fn(this);
    }
    return Promise.all(fn);
  }

  async $disconnect() {}

  _loadFromDisk() {
    try {
      if (fs.existsSync(STORE_PATH)) {
        const raw = fs.readFileSync(STORE_PATH, 'utf-8');
        const data = JSON.parse(raw);
        for (const [key, val] of Object.entries(data)) {
          if (Array.isArray(val)) {
            const targetKey = key === '_dyn_emailOtp' ? 'emailOtps' : (key === '_dyn_fileEncryption' ? 'fileEncryptions' : key);
            this[targetKey] = val.map(item => {
              const parsed = { ...item };
              for (const [k, v] of Object.entries(parsed)) {
                if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) {
                  parsed[k] = new Date(v);
                }
              }
              return parsed;
            });
          } else if (key === 'seq' && typeof val === 'number') {
            this.seq = val;
          }
          // Never assign plain objects or collections to this[key] during disk loading
        }
        if (!this.seq || this.seq < 100) this.seq = 100;
      }
    } catch (err) {
      console.error('[PersistentStore] Error loading from disk:', err.message);
    }
  }

  _saveToDisk() {
    try {
      const dataDir = path.dirname(STORE_PATH);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const snapshot = { seq: this.seq };
      for (const [key, val] of Object.entries(this)) {
        if (Array.isArray(val)) {
          snapshot[key] = val;
        }
      }
      const json = JSON.stringify(snapshot, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value, 2
      );
      fs.writeFileSync(STORE_PATH, json, 'utf-8');
    } catch (err) {
      console.error('[PersistentStore] Error saving to disk:', err.message);
    }
  }

  _createCollection(name) {
    const list = this[name];
    const self = this;

    return {
      create: async ({ data }) => {
        const item = {
          id: self.seq++,
          publicId: (data && data.publicId) ? data.publicId : crypto.randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
          ...(name === 'notifications' ? { isRead: false } : {}),
          ...(name === 'emailOtps' || name === '_dyn_emailOtp' ? { attempts: 0, maxAttempts: 5, consumedAt: null } : {}),
          ...(name === 'users' ? { emailVerified: false, status: 'ACTIVE', role: 'OWNER' } : {}),
          ...(name === 'orderFiles' ? { allowDownload: false, isPurged: false, status: 'UPLOADED' } : {}),
          ...data,
        };
        list.push(item);
        self._saveToDisk();
        return item;
      },
      createMany: async ({ data }) => {
        const created = (Array.isArray(data) ? data : [data]).map(d => {
          const item = {
            id: self.seq++,
            publicId: (d && d.publicId) ? d.publicId : crypto.randomUUID(),
            createdAt: new Date(),
            updatedAt: new Date(),
            ...(name === 'notifications' ? { isRead: false } : {}),
          ...(name === 'emailOtps' || name === '_dyn_emailOtp' ? { attempts: 0, maxAttempts: 5, consumedAt: null } : {}),
          ...(name === 'users' ? { emailVerified: false, status: 'ACTIVE', role: 'OWNER' } : {}),
          ...(name === 'orderFiles' ? { allowDownload: false, isPurged: false, status: 'UPLOADED' } : {}),
            ...d,
          };
          list.push(item);
          return item;
        });
        self._saveToDisk();
        return { count: created.length };
      },
      findUnique: async ({ where, include } = {}) => {
        return self._findItem(list, where, include);
      },
      findFirst: async ({ where, include, orderBy } = {}) => {
        let items = list;
        if (orderBy) {
          const [field, dir] = Object.entries(orderBy)[0];
          items = [...list].sort((a, b) => {
            const va = a[field] instanceof Date ? a[field].getTime() : a[field];
            const vb = b[field] instanceof Date ? b[field].getTime() : b[field];
            if (dir === 'desc') return (vb > va ? 1 : (vb < va ? -1 : 0));
            return (va > vb ? 1 : (va < vb ? -1 : 0));
          });
        }
        return self._findItem(items, where, include);
      },
      upsert: async ({ where, create, update } = {}) => {
        const existing = self._findItem(list, where);
        if (existing) {
          Object.assign(existing, update, { updatedAt: new Date() });
          self._saveToDisk();
          return existing;
        }
        const item = {
          id: self.seq++,
          publicId: (create && create.publicId) ? create.publicId : crypto.randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
          ...(name === 'notifications' ? { isRead: false } : {}),
          ...(name === 'emailOtps' || name === '_dyn_emailOtp' ? { attempts: 0, maxAttempts: 5, consumedAt: null } : {}),
          ...(name === 'users' ? { emailVerified: false, status: 'ACTIVE', role: 'OWNER' } : {}),
          ...(name === 'orderFiles' ? { allowDownload: false, isPurged: false, status: 'UPLOADED' } : {}),
          ...create,
        };
        list.push(item);
        self._saveToDisk();
        return item;
      },
      findMany: async ({ where, include, orderBy, take, skip } = {}) => {
        let results = list.filter(item => self._matchWhere(item, where));
        if (orderBy) {
          const [field, dir] = Object.entries(orderBy)[0];
          results.sort((a, b) => {
            if (dir === 'desc') return (b[field] > a[field] ? 1 : (b[field] < a[field] ? -1 : 0));
            return (a[field] > b[field] ? 1 : (a[field] < b[field] ? -1 : 0));
          });
        }
        if (skip) results = results.slice(skip);
        if (take) results = results.slice(0, take);
        return results.map(item => self._attachIncludes(item, include));
      },
      groupBy: async ({ by = [], where, _count } = {}) => {
        const filtered = list.filter(item => self._matchWhere(item, where));
        const groups = {};
        for (const it of filtered) {
          const key = by.map(k => it[k]).join('_');
          if (!groups[key]) {
            groups[key] = { ...by.reduce((acc, k) => ({ ...acc, [k]: it[k] }), {}), _count: { id: 0, status: 0 } };
          }
          groups[key]._count.id++;
          groups[key]._count.status++;
        }
        return Object.values(groups);
      },
      count: async ({ where } = {}) => {
        if (!where) return list.length;
        return list.filter(item => self._matchWhere(item, where)).length;
      },
      update: async ({ where, data, include }) => {
        const item = list.find(it => self._matchWhere(it, where));
        if (item) {
          Object.assign(item, data, { updatedAt: new Date() });
          self._saveToDisk();
          return self._attachIncludes(item, include);
        }
        throw new Error('Record not found for update');
      },
      updateMany: async ({ where, data }) => {
        const items = list.filter(item => self._matchWhere(item, where));
        items.forEach(item => Object.assign(item, data, { updatedAt: new Date() }));
        self._saveToDisk();
        return { count: items.length };
      },
      delete: async ({ where }) => {
        const idx = list.findIndex(item => self._matchWhere(item, where));
        if (idx !== -1) {
          const removed = list.splice(idx, 1)[0];
          self._saveToDisk();
          return removed;
        }
        return null;
      },
      deleteMany: async ({ where } = {}) => {
        if (!where) {
          const count = list.length;
          list.length = 0;
          self._saveToDisk();
          return { count };
        }
        let count = 0;
        for (let i = list.length - 1; i >= 0; i--) {
          if (self._matchWhere(list[i], where)) {
            list.splice(i, 1);
            count++;
          }
        }
        self._saveToDisk();
        return { count };
      },
    };
  }

  _matchWhere(item, where) {
    if (!where) return true;

    if (where.OR && Array.isArray(where.OR)) {
      const orMatched = where.OR.some(subWhere => this._matchWhere(item, subWhere));
      if (!orMatched) return false;
    }

    for (const key of Object.keys(where)) {
      if (key === 'OR') continue;
      const val = where[key];
      if (key === 'shopId_userId' && typeof val === 'object') {
        if (item.shopId !== val.shopId || item.userId !== val.userId) return false;
        continue;
      }
      if (key === 'order' && typeof val === 'object' && val.shopId) {
        const order = this.orders.find(o => o.id === item.orderId);
        if (!order || order.shopId !== val.shopId) return false;
        continue;
      }
      if (key === 'file' && typeof val === 'object' && val.order && val.order.shopId) {
        const file = this.orderFiles.find(f => f.id === item.fileId);
        if (!file) return false;
        const order = this.orders.find(o => o.id === file.orderId);
        if (!order || order.shopId !== val.order.shopId) return false;
        continue;
      }
      if (key === 'printer' && typeof val === 'object' && val.isActive !== undefined) {
        const printer = this.printers.find(p => p.id === item.printerId);
        if (!printer || printer.isActive !== val.isActive) return false;
        continue;
      }
      if (key === 'publicId') {
        if (item.publicId === val) continue;
        if (String(item.id) === String(val)) continue;
        return false;
      }
      if (key === 'id' && typeof val !== 'object') {
        if (item.id === val) continue;
        if (item.publicId === String(val)) continue;
        return false;
      }
      if (val instanceof Date) {
        const itemVal = item[key] instanceof Date ? item[key] : new Date(item[key]);
        if (itemVal.getTime() !== val.getTime()) return false;
        continue;
      }
      if (val && typeof val === 'object') {
        if (val.in && !val.in.includes(item[key])) return false;
        if (val.notIn && val.notIn.includes(item[key])) return false;
        if (val.gte && (item[key] < val.gte)) return false;
        if (val.lte && (item[key] > val.lte)) return false;
        if (val.gt && (item[key] <= val.gt)) return false;
        if (val.lt && (item[key] >= val.lt)) return false;
        if (val.not !== undefined && item[key] === val.not) return false;
        continue;
      }
      if (val === null) {
        if (item[key] !== null && item[key] !== undefined) return false;
        continue;
      }
      if (item[key] !== val) return false;
    }
    return true;
  }

  _findItem(list, where, include) {
    const item = list.find(it => this._matchWhere(it, where));
    if (!item) return null;
    return this._attachIncludes(item, include);
  }

  _attachIncludes(item, include) {
    if (!include) return { ...item };
    const res = { ...item };

    if (include.shop) {
      const s = this.shops.find(sh => sh.id === item.shopId);
      if (s) {
        res.shop = { ...s };
        if (include.shop.include?.shopSettings) {
          res.shop.shopSettings = this._shopSettings.find(ss => ss.shopId === s.id) || null;
        }
      } else {
        res.shop = null;
      }
    }

    if (include.shopSettings) {
      res.shopSettings = this._shopSettings.find(ss => ss.shopId === item.id) || null;
    }

    if (include.additionalServices) {
      res.additionalServices = this.additionalServices.filter(s => s.shopId === item.id && (include.additionalServices.where?.isActive === undefined || s.isActive === include.additionalServices.where.isActive));
    }

    if (include.pricingRules) {
      res.pricingRules = this.pricingRules.filter(r => r.shopId === item.id && (include.pricingRules.where?.isActive === undefined || r.isActive === include.pricingRules.where.isActive));
    }

    if (include.orderFiles) {
      res.orderFiles = (this.orderFiles || [])
        .filter(f => f.orderId === item.id)
        .map(f => {
          if (!f.publicId) {
            f.publicId = crypto.randomUUID();
          }
          const fileCopy = { ...f };
          fileCopy.printConfiguration = (this.printConfigurations || []).find(c => c.fileId === f.id) || null;
          fileCopy.orderFileServices = (this.orderFileServices || [])
            .filter(s => s.fileId === f.id)
            .map(s => ({
              ...s,
              additionalService: (this.additionalServices || []).find(as => as.id === (s.additionalServiceId || s.serviceId)) || null,
            }));
          fileCopy.printJobs = (this.printJobs || [])
            .filter(pj => pj.fileId === f.id)
            .sort((a, b) => (b.attemptNumber || 0) - (a.attemptNumber || 0));
          return fileCopy;
        });
    }

    if (include.printJobs) {
      res.printJobs = (this.printJobs || [])
        .filter(pj => pj.fileId === item.id)
        .sort((a, b) => (b.attemptNumber || 0) - (a.attemptNumber || 0));
    }

    if (include.order) {
      res.order = this.orders.find(o => o.id === item.orderId) || null;
    }

    if (include.orders) {
      let ords = this.orders.filter(o => o.sessionId === item.id);
      if (include.orders.where?.status) {
        ords = ords.filter(o => o.status === include.orders.where.status);
      }
      res.orders = ords.map(o => this._attachIncludes(o, include.orders.include));
    }

    if (include.session) {
      res.session = this.customerSessions.find(s => s.id === item.sessionId) || null;
    }

    if (include.payments) {
      res.payments = this.payments.filter(p => p.orderId === item.id);
    }

    if (include.expiryLogs) {
      res.expiryLogs = this.expiryLogs.filter(el => el.orderId === item.id);
    }

    if (include.file) {
      const f = this.orderFiles.find(file => file.id === item.fileId) || null;
      if (f) {
        res.file = { ...f };
        if (include.file.include?.order) {
          res.file.order = this.orders.find(o => o.id === f.orderId) || null;
        }
      } else {
        res.file = null;
      }
    }

    if (include.printer) {
      res.printer = this.printers.find(p => p.id === item.printerId) || null;
    }

    if (include.user) {
      res.user = this.users.find(u => u.id === item.userId) || null;
    }

    if (include.statusLogs) {
      res.statusLogs = this.orderStatusLogs
        .filter(l => l.orderId === item.id)
        .sort((a, b) => b.createdAt - a.createdAt);
    }

    return res;
  }
}

module.exports = { InMemoryPrisma };
