import { AsyncLocalStorage } from 'node:async_hooks';

/** Serializes access to a provider connection, including reads during async SQLite
 * transactions. Native DB transactions still enforce inter-process atomicity.
 * Never perform network / publishing calls inside a business transaction. */
export class StoreCoordinator {
  private scope = new AsyncLocalStorage<{ native?: any }>();
  private tail: Promise<unknown> = Promise.resolve();
  get native(): any { return this.scope.getStore()?.native; }
  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.scope.getStore()) return fn();
    const previous = this.tail;
    let release!: () => void;
    this.tail = new Promise<void>(r => { release = r; });
    await previous;
    try { return await this.scope.run({}, fn); } finally { release(); }
  }
  async transaction<T>(begin: () => Promise<any>, commit: (n: any) => Promise<void>, rollback: (n: any) => Promise<void>, fn: () => Promise<T>): Promise<T> {
    return this.call(async () => {
      if (this.native) return fn();
      const native = await begin();
      try {
        const result = await this.scope.run({ native }, fn);
        await commit(native);
        return result;
      } catch (error) { try { await rollback(native); } catch { /* preserve original error */ } throw error; }
    });
  }
  async inScope<T>(native: any, fn: () => Promise<T>): Promise<T> { return this.scope.run({ native }, fn); }
  wrap<T extends object>(target: T): T {
    const cache = new Map<PropertyKey, unknown>();
    return new Proxy(target, {
      get: (t, key, receiver) => {
        const value = Reflect.get(t, key, receiver);
        if (typeof value !== 'function' || value.constructor.name !== 'AsyncFunction') return value;
        if (!cache.has(key)) cache.set(key, (...args: any[]) => this.call(() => value.apply(t, args)));
        return cache.get(key);
      },
    });
  }
}

/** Injects the current Mongo session into collection operations, not cursor methods. */
export function sessionCollection(collection: any, session: any): any {
  if (!session) return collection;
  const secondOptions = new Set(['find','findOne','insertOne','insertMany','deleteOne','deleteMany','countDocuments','aggregate','findOneAndDelete','distinct']);
  const thirdOptions = new Set(['updateOne','updateMany','replaceOne','findOneAndUpdate','findOneAndReplace']);
  return new Proxy(collection, { get(target, key: string) {
    const value = target[key];
    if (typeof value !== 'function') return value;
    return (...args: any[]) => {
      const index = thirdOptions.has(key) ? 2 : secondOptions.has(key) ? 1 : -1;
      if (index >= 0) args[index] = { ...(args[index] || {}), session };
      return value.apply(target, args);
    };
  } });
}

export const versionConflict = () => Object.assign(new Error('VERSION_CONFLICT'), { code: 'VERSION_CONFLICT', statusCode: 409 });
