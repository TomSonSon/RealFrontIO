import { diffGraphs } from "./util/Snapshot";

type Node = { id: number; next: Node | null };

function chain(length: number, lastId = length - 1): Node {
  let head: Node | null = null;
  for (let i = length - 1; i >= 0; i--) {
    head = { id: i === length - 1 ? lastId : i, next: head };
  }
  return head!;
}

describe("diffGraphs", () => {
  test("walks a chain far deeper than the call stack", () => {
    expect(diffGraphs(chain(200_000), chain(200_000))).toEqual([]);
  });

  test("reports the difference at the end of a deep chain", () => {
    const diffs = diffGraphs(chain(200_000), chain(200_000, -1));
    expect(diffs).toHaveLength(1);
    expect(diffs[0].endsWith(".id: 199999 !== -1")).toBe(true);
  });

  test("handles cycles and aliasing", () => {
    const make = () => {
      const a: Node = { id: 1, next: null };
      a.next = a;
      return {
        a,
        list: Array.from({ length: 3 }, (_, i) => (i === 1 ? undefined : i)),
        again: a,
      };
    };
    expect(diffGraphs(make(), make())).toEqual([]);

    const broken = make();
    broken.again = { id: 1, next: null };
    expect(diffGraphs(make(), broken)).toEqual([
      "game.again: aliasing differs",
    ]);
  });
});
