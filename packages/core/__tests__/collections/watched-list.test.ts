import { describe, it, expect } from 'vitest';
import { WatchedList } from '../../collections/watched-list.js';

// Simple item type for testing
interface Item {
  id: number;
  name: string;
}

// Concrete WatchedList that compares by id
class ItemList extends WatchedList<Item> {
  compareItems(a: Item, b: Item): boolean {
    return a.id === b.id;
  }

  static create(items: Item[]): ItemList {
    return new ItemList(items);
  }
}

const a: Item = { id: 1, name: 'Alice' };
const b: Item = { id: 2, name: 'Bob' };
const c: Item = { id: 3, name: 'Charlie' };

describe('WatchedList', () => {
  describe('initial state', () => {
    it('getItems() returns the initial items', () => {
      const list = ItemList.create([a, b]);
      expect(list.getItems()).toEqual([a, b]);
    });

    it('getNewItems() is empty on initialisation', () => {
      const list = ItemList.create([a, b]);
      expect(list.getNewItems()).toHaveLength(0);
    });

    it('getRemovedItems() is empty on initialisation', () => {
      const list = ItemList.create([a, b]);
      expect(list.getRemovedItems()).toHaveLength(0);
    });

    it('works with an empty initial list', () => {
      const list = ItemList.create([]);
      expect(list.getItems()).toHaveLength(0);
    });
  });

  describe('add()', () => {
    it('adds a new item to getItems() and getNewItems()', () => {
      const list = ItemList.create([a]);
      list.add(c);
      expect(list.getItems()).toContainEqual(c);
      expect(list.getNewItems()).toContainEqual(c);
    });

    it('is a no-op when the item is already in the current list', () => {
      const list = ItemList.create([a, b]);
      list.add(a);
      expect(list.getItems()).toHaveLength(2);
      expect(list.getNewItems()).toHaveLength(0);
    });

    it('re-adding a previously removed initial item cancels the removal', () => {
      const list = ItemList.create([a, b]);
      list.remove(b);
      expect(list.getRemovedItems()).toContainEqual(b);
      list.add(b);
      // b is restored: not in removedItems, not in newItems
      expect(list.getRemovedItems()).not.toContainEqual(b);
      expect(list.getNewItems()).not.toContainEqual(b);
      expect(list.getItems()).toContainEqual(b);
    });

    it('does not mark a restored item as new', () => {
      const list = ItemList.create([a]);
      list.remove(a);
      list.add(a);
      expect(list.getNewItems()).toHaveLength(0);
    });
  });

  describe('remove()', () => {
    it('removes an initial item from getItems() and marks it in getRemovedItems()', () => {
      const list = ItemList.create([a, b]);
      list.remove(a);
      expect(list.getItems()).not.toContainEqual(a);
      expect(list.getRemovedItems()).toContainEqual(a);
    });

    it('is a no-op when the item is not in the list', () => {
      const list = ItemList.create([a]);
      list.remove(c); // c was never added
      expect(list.getItems()).toHaveLength(1);
      expect(list.getRemovedItems()).toHaveLength(0);
    });

    it('removing a newly added item cancels the addition', () => {
      const list = ItemList.create([a]);
      list.add(c); // c is new
      list.remove(c);
      expect(list.getItems()).not.toContainEqual(c);
      expect(list.getNewItems()).not.toContainEqual(c);
      expect(list.getRemovedItems()).not.toContainEqual(c);
    });
  });

  describe('getItems() returns a copy', () => {
    it('mutating the returned array does not affect the list', () => {
      const list = ItemList.create([a, b]);
      const items = list.getItems();
      items.push(c);
      expect(list.getItems()).toHaveLength(2);
    });
  });

  describe('getNewItems() returns a copy', () => {
    it('mutating the returned array does not affect the list', () => {
      const list = ItemList.create([]);
      list.add(a);
      const newItems = list.getNewItems();
      newItems.push(c);
      expect(list.getNewItems()).toHaveLength(1);
    });
  });

  describe('getRemovedItems() returns a copy', () => {
    it('mutating the returned array does not affect the list', () => {
      const list = ItemList.create([a, b]);
      list.remove(a);
      const removed = list.getRemovedItems();
      removed.push(c);
      expect(list.getRemovedItems()).toHaveLength(1);
    });
  });

  describe('compound scenario', () => {
    it('add, remove, re-add across multiple items tracks correctly', () => {
      const list = ItemList.create([a, b]);
      list.add(c);    // new
      list.remove(a); // initial → removed
      list.remove(c); // new → cancelled

      expect(list.getItems()).toEqual([b]);
      expect(list.getNewItems()).toHaveLength(0);
      expect(list.getRemovedItems()).toEqual([a]);
    });
  });
});
