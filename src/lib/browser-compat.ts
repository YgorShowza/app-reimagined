declare global {
  interface Array<T> {
    findLastIndex(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: unknown): number;
  }
}

if (typeof Array.prototype.findLastIndex !== "function") {
  Object.defineProperty(Array.prototype, "findLastIndex", {
    configurable: true,
    writable: true,
    value: function findLastIndex<T>(this: T[], predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: unknown) {
      for (let index = this.length - 1; index >= 0; index -= 1) {
        if (predicate.call(thisArg, this[index] as T, index, this)) return index;
      }
      return -1;
    },
  });
}

export {};
