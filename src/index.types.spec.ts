import { describe, expect, expectTypeOf, it } from "vitest";
import * as original from "./index.js";
import type { TypedSql, TypedSqlApi } from "./index.js";

type BindValue = string | number;
const typed = original as TypedSqlApi<BindValue>;

function typedClient(query: { text: string; values: BindValue[] }) {
  return query.values;
}

describe("typed SQL", () => {
  it("preserves the existing runtime exports", () => {
    expect(typed.default).toBe(original.default);
    expect(typed.Sql).toBe(original.Sql);
    expect(typed.join).toBe(original.join);
    expect(typed.bulk).toBe(original.bulk);
    expect(typed.raw).toBe(original.raw);
    expect(typed.empty).toBe(original.empty);
  });

  it("supports typed clients and individual helper imports", () => {
    const sql = original.default as TypedSqlApi<BindValue>["default"];
    const join = original.join as TypedSqlApi<BindValue>["join"];
    const stringApi = original as TypedSqlApi<string>;
    const name = stringApi.default`name = ${"Ada"}`;
    const query = sql`SELECT ${typed.raw(
      "id",
    )} FROM users WHERE ${name} AND id IN (${join([1, 2])})${typed.empty}`;

    expect(query.text).toEqual(
      "SELECT id FROM users WHERE name = $1 AND id IN ($2,$3)",
    );
    expect(query.sql).toEqual(
      "SELECT id FROM users WHERE name = ? AND id IN (?,?)",
    );
    expect(query.statement).toEqual(
      "SELECT id FROM users WHERE name = :1 AND id IN (:2,:3)",
    );
    expect(typedClient(query)).toEqual(["Ada", 1, 2]);
    expect(query).toBeInstanceOf(original.Sql);
    expectTypeOf(query.values).toEqualTypeOf<BindValue[]>();
    expectTypeOf(query.inspect().values).toEqualTypeOf<BindValue[]>();
    expectTypeOf(typed.raw("id")).toMatchTypeOf<TypedSql<BindValue>>();
    expectTypeOf(typed.empty).toMatchTypeOf<TypedSql<BindValue>>();
  });

  it("types bulk, joined queries and the constructor", () => {
    const row = new typed.Sql(["", ""], [1]);
    const joined = typed.join([row, 2], ",", "(", ")");
    const values = typed.bulk([
      [1, "Ada"],
      [2, "Grace"],
    ]);

    expect(typedClient(row)).toEqual([1]);
    expect(joined.text).toEqual("($1,$2)");
    expect(typedClient(joined)).toEqual([1, 2]);
    expect(values.text).toEqual("($1,$2),($3,$4)");
    expect(typedClient(values)).toEqual([1, "Ada", 2, "Grace"]);
    expectTypeOf(row.inspect().values).toEqualTypeOf<BindValue[]>();
  });

  it("keeps the default value type permissive", () => {
    const custom = { custom: true };
    const query = original.default`SELECT ${custom}`;

    expect(query.values).toEqual([custom]);
    expectTypeOf(query.values).toEqualTypeOf<unknown[]>();
  });

  it("rejects unsupported inputs during type checking", () => {
    const booleanApi = original as TypedSqlApi<boolean>;
    const incompatible = booleanApi.default`SELECT ${true}`;

    // These branches are checked by tsc without invoking invalid consumer code.
    if (false) {
      // @ts-expect-error A boolean is not a supported parameter value.
      typed.default`SELECT ${true}`;
      // @ts-expect-error Nested queries must use compatible parameter types.
      typed.default`SELECT ${incompatible}`;
      // @ts-expect-error Unrestricted queries cannot promise BindValue values.
      typed.default`SELECT ${original.default`SELECT ${true}`}`;
      // @ts-expect-error Joined parameters must match the selected value type.
      typed.join([true]);
      // @ts-expect-error Joined queries must have compatible values.
      typed.join([incompatible]);
      // @ts-expect-error Bulk rows must use supported parameter values.
      typed.bulk([[true]]);
      // @ts-expect-error Bulk nested queries must have compatible values.
      typed.bulk([[incompatible]]);
      // @ts-expect-error The constructor uses the selected parameter type.
      new typed.Sql(["", ""], [true]);
      // @ts-expect-error The constructor rejects incompatible nested queries.
      new typed.Sql(["", ""], [incompatible]);
      // @ts-expect-error The facade describes read-only module exports.
      typed.empty = typed.raw("");
    }
  });
});
