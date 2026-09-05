// In-memory, serializable transaction adapter. No network, Firebase SDK or credentials.
const clone = (value) => value === undefined ? undefined : structuredClone(value);
class FakeFirestore {
  constructor(seed = {}) { this.data = new Map(Object.entries(clone(seed))); this.queue = Promise.resolve(); this.sequence = 0; }
  read(path) { return clone(this.data.get(path)); }
  count(collection) { return [...this.data.keys()].filter((key) => key.startsWith(`${collection}/`)).length; }
  snapshot(path) {
    const value = this.read(path);
    return { exists: value !== undefined, id: path.split("/").at(-1), data: () => clone(value) };
  }
  collection(name) {
    const database = this;
    const makeQuery = (filters = [], sortField, maximum = Infinity) => ({
      doc(id = `generated-${++database.sequence}`) {
        const path = `${name}/${id}`;
        return { id, path, get: async () => database.snapshot(path) };
      },
      where(field, operation, value) { return makeQuery([...filters, { field, operation, value }], sortField, maximum); },
      orderBy(field) { return makeQuery(filters, field, maximum); },
      limit(number) { return makeQuery(filters, sortField, number); },
      async get() {
        const matches = [...database.data.entries()].filter(([path, value]) => path.startsWith(`${name}/`) && filters.every((filter) => filter.operation === "==" ? value[filter.field] === filter.value : value[filter.field] <= filter.value));
        if (sortField) matches.sort((a, b) => a[1][sortField] - b[1][sortField]);
        return { docs: matches.slice(0, maximum).map(([path]) => database.snapshot(path)) };
      },
    });
    return makeQuery();
  }
  async runTransaction(operation) {
    const previous = this.queue;
    let release;
    this.queue = new Promise((resolve) => { release = resolve; });
    await previous;
    const writes = [];
    try {
      const result = await operation({
        get: async (reference) => {
          if (writes.length) throw new Error("Firestore transactions require reads before writes");
          return this.snapshot(reference.path);
        },
        set: (reference, value) => writes.push({ mode: "set", path: reference.path, value: clone(value) }),
        create: (reference, value) => writes.push({ mode: "create", path: reference.path, value: clone(value) }),
        update: (reference, value) => writes.push({ mode: "update", path: reference.path, value: clone(value) }),
      });
      for (const write of writes) {
        if (write.mode === "create" && this.data.has(write.path)) throw new Error("Already exists");
        if (write.mode === "update" && !this.data.has(write.path)) throw new Error("Missing document");
      }
      for (const write of writes) this.data.set(write.path, write.mode === "update" ? { ...this.data.get(write.path), ...write.value } : write.value);
      return result;
    } finally { release(); }
  }
}
module.exports = { FakeFirestore };
