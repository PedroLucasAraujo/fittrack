/**
 * Abstract base class for tracking changes to a collection of subordinate
 * entities within an aggregate root.
 *
 * ## Purpose
 *
 * When an aggregate loads a collection (e.g., `ServicePlan.deliverables`),
 * the repository needs to know which items were added and which were removed
 * so it can issue targeted INSERT/DELETE statements rather than deleting all
 * and re-inserting. `WatchedList` provides this change-tracking mechanism.
 *
 * ## Usage
 *
 * ```typescript
 * class DeliverableList extends WatchedList<Deliverable> {
 *   compareItems(a: Deliverable, b: Deliverable): boolean {
 *     return a.id === b.id;
 *   }
 * }
 *
 * // In ServicePlan aggregate:
 * this.deliverables = new DeliverableList(loadedDeliverables);
 * this.deliverables.add(newDeliverable);
 * this.deliverables.remove(existingDeliverable);
 *
 * // In repository mapper:
 * plan.deliverables.getNewItems()     // → INSERT these
 * plan.deliverables.getRemovedItems() // → DELETE these
 * plan.deliverables.getItems()        // → full current list
 * ```
 *
 * ## Change-tracking semantics
 *
 * - `newItems`: items added in the current session that were not in the
 *   original collection. These require an INSERT.
 * - `removedItems`: items present in the original collection but removed
 *   in the current session. These require a DELETE.
 * - Re-adding a previously removed item cancels the removal (no INSERT, no
 *   DELETE — it was already persisted).
 * - Removing an item that was added in the current session cancels the
 *   addition (no INSERT, no DELETE).
 */
export abstract class WatchedList<T> {
  private currentItems: T[];
  private readonly initialItems: T[];
  private newItems: T[];
  private removedItems: T[];

  protected constructor(initialItems: T[]) {
    this.currentItems = [...initialItems];
    this.initialItems = [...initialItems];
    this.newItems = [];
    this.removedItems = [];
  }

  /**
   * Returns `true` if `a` and `b` represent the same item.
   * Typically compares by entity ID.
   */
  abstract compareItems(a: T, b: T): boolean;

  /** Returns the current full list of items (initial + added − removed). */
  getItems(): T[] {
    return [...this.currentItems];
  }

  /** Returns items added since the list was initialised. Require INSERT. */
  getNewItems(): T[] {
    return [...this.newItems];
  }

  /** Returns items removed since the list was initialised. Require DELETE. */
  getRemovedItems(): T[] {
    return [...this.removedItems];
  }

  /**
   * Adds an item to the list.
   *
   * - If the item is already in the current list: no-op.
   * - If the item was previously removed (was in initial list): the removal
   *   is cancelled and the item is restored without marking it as new.
   * - Otherwise: the item is marked as new and added to the current list.
   */
  add(item: T): void {
    if (this.isCurrentItem(item)) {
      return;
    }

    if (this.wasRemovedItem(item)) {
      this.removeFromArray(this.removedItems, item);
    } else if (!this.isInitialItem(item)) {
      this.newItems.push(item);
    }

    this.currentItems.push(item);
  }

  /**
   * Removes an item from the list.
   *
   * - If the item is not in the current list: no-op.
   * - If the item was newly added in this session: the addition is cancelled
   *   (removed from `newItems`, no DELETE needed).
   * - If the item was in the initial list: it is marked as removed.
   */
  remove(item: T): void {
    if (!this.isCurrentItem(item)) {
      return;
    }

    this.removeFromArray(this.currentItems, item);

    if (this.isNewItem(item)) {
      this.removeFromArray(this.newItems, item);
    } else if (this.isInitialItem(item)) {
      this.removedItems.push(item);
    }
  }

  private isCurrentItem(item: T): boolean {
    return this.currentItems.some((i) => this.compareItems(i, item));
  }

  private isInitialItem(item: T): boolean {
    return this.initialItems.some((i) => this.compareItems(i, item));
  }

  private isNewItem(item: T): boolean {
    return this.newItems.some((i) => this.compareItems(i, item));
  }

  private wasRemovedItem(item: T): boolean {
    return this.removedItems.some((i) => this.compareItems(i, item));
  }

  private removeFromArray(arr: T[], item: T): void {
    const index = arr.findIndex((i) => this.compareItems(i, item));
    if (index !== -1) arr.splice(index, 1);
  }
}
