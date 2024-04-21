import { inspect } from "util";
import { describe, it, expect } from "vitest";
import sql, { empty, join, bulk, raw, Sql, BIND_PARAM } from "./index.js";

describe("sql template tag", () => {
  it("should generate sql", () => {
    const query = sql`SELECT * FROM books`;

    expect(query.sql).toEqual("SELECT * FROM books");
    expect(query.text).toEqual("SELECT * FROM books");
    expect(query.statement).toEqual("SELECT * FROM books");
    expect(query.values).toEqual([]);
  });

  it("should embed sql in sql", () => {
    const tableName = sql`books`;
    const query = sql`SELECT * FROM ${tableName}`;

    expect(query.sql).toEqual("SELECT * FROM books");
    expect(query.text).toEqual("SELECT * FROM books");
    expect(query.statement).toEqual("SELECT * FROM books");
    expect(query.values).toEqual([]);
  });

  it("should store values", () => {
    const name = "Blake";
    const query = sql`SELECT * FROM books WHERE author = ${name}`;

    expect(query.sql).toEqual("SELECT * FROM books WHERE author = ?");
    expect(query.text).toEqual("SELECT * FROM books WHERE author = $1");
    expect(query.statement).toEqual("SELECT * FROM books WHERE author = :1");
    expect(query.values).toEqual([name]);
  });

  it("should build sql with child sql statements", () => {
    const subquery = sql`SELECT id FROM authors WHERE name = ${"Blake"}`;
    const query = sql`SELECT * FROM books WHERE author_id IN (${subquery})`;

    expect(query.sql).toEqual(
      "SELECT * FROM books WHERE author_id IN (SELECT id FROM authors WHERE name = ?)",
    );
    expect(query.text).toEqual(
      "SELECT * FROM books WHERE author_id IN (SELECT id FROM authors WHERE name = $1)",
    );
    expect(query.statement).toEqual(
      "SELECT * FROM books WHERE author_id IN (SELECT id FROM authors WHERE name = :1)",
    );
    expect(query.values).toEqual(["Blake"]);
  });

  it("should not cache values for mysql compatibility", () => {
    const ids = [1, 2, 3];
    const query = sql`SELECT * FROM books WHERE id IN (${join(
      ids,
    )}) OR author_id IN (${join(ids)})`;

    expect(query.sql).toEqual(
      "SELECT * FROM books WHERE id IN (?,?,?) OR author_id IN (?,?,?)",
    );
    expect(query.text).toEqual(
      "SELECT * FROM books WHERE id IN ($1,$2,$3) OR author_id IN ($4,$5,$6)",
    );
    expect(query.statement).toEqual(
      "SELECT * FROM books WHERE id IN (:1,:2,:3) OR author_id IN (:4,:5,:6)",
    );
    expect(query.values).toEqual([1, 2, 3, 1, 2, 3]);
  });

  it('should provide "empty" helper', () => {
    const query = sql`SELECT * FROM books ${empty}`;

    expect(query.sql).toEqual("SELECT * FROM books ");
    expect(query.text).toEqual("SELECT * FROM books ");
    expect(query.statement).toEqual("SELECT * FROM books ");
    expect(query.values).toEqual([]);
  });

  it("should throw in constructor with no strings", () => {
    expect(() => new Sql([], [])).toThrowError("Expected at least 1 string");
  });

  it("should throw when values is less than expected", () => {
    expect(() => new Sql(["", ""], [])).toThrowError(
      "Expected 2 strings to have 1 values",
    );
  });

  it("should inspect sql instance", () => {
    expect(inspect(sql`SELECT * FROM test`)).toContain(`'SELECT * FROM test'`);
  });

  it("should handle escaped back ticks", () => {
    const query = sql`UPDATE user SET \`name\` = 'Taylor'`;

    expect(query.text).toEqual("UPDATE user SET `name` = 'Taylor'");
  });

  describe("join", () => {
    it("should join list", () => {
      const query = join([1, 2, 3]);

      expect(query.text).toEqual("$1,$2,$3");
      expect(query.values).toEqual([1, 2, 3]);
    });

    it("should error joining an empty list", () => {
      expect(() => join([])).toThrowError(TypeError);
    });

    it("should join sql", () => {
      const query = join(
        [
          sql`user.first_name LIKE ${"Test"}`,
          sql`user.last_name LIKE ${"User"}`,
        ],
        " AND ",
      );

      expect(query.text).toEqual(
        "user.first_name LIKE $1 AND user.last_name LIKE $2",
      );
      expect(query.values).toEqual(["Test", "User"]);
    });

    it("should support one term without separators", () => {
      const query = join([sql`user.first_name LIKE ${"Test"}`], " AND ");

      expect(query.text).toEqual("user.first_name LIKE $1");
      expect(query.values).toEqual(["Test"]);
    });

    it("should configure prefix and suffix characters", () => {
      const query = join([1, 2, 3], ",", "(", ")");

      expect(query.text).toEqual("($1,$2,$3)");
      expect(query.values).toEqual([1, 2, 3]);
    });
  });

  describe("raw", () => {
    it("should accept any string", () => {
      const value = Math.random().toString();
      const query = raw(value);

      expect(query.sql).toEqual(value);
      expect(query.values).toEqual([]);
    });
  });

  describe("value typing", () => {
    it.each([
      ["string", "Blake"],
      ["number", 123],
      ["boolean", true],
      ["Date", new Date("2010-01-01T00:00:00Z")],
      ["null", null],
      ["undefined", undefined],
      ["string array", ["Blake", "Taylor"]],
      ["object", { name: "Blake" }],
    ])("should allow using %s as a value", (_type, value) => {
      const query = sql`UPDATE user SET any_value = ${value}`;
      expect(query.values).toEqual([value]);
    });
  });

  describe("bind parameters", () => {
    it("should bind parameters", () => {
      const query = sql`SELECT * FROM books WHERE author = ${BIND_PARAM}`;
      const values = query.bind("Blake");

      expect(query.text).toEqual("SELECT * FROM books WHERE author = $1");
      expect(query.values).toEqual([BIND_PARAM]);
      expect(values).toEqual(["Blake"]);
    });

    it("should merge with other values", () => {
      const query = sql`SELECT * FROM books WHERE author = ${BIND_PARAM} OR author_id = ${"Taylor"}`;
      const values = query.bind("Blake");

      expect(query.text).toEqual(
        "SELECT * FROM books WHERE author = $1 OR author_id = $2",
      );
      expect(query.values).toEqual([BIND_PARAM, "Taylor"]);
      expect(values).toEqual(["Blake", "Taylor"]);
    });

    it("should error when binding too many parameters", () => {
      const query = sql`SELECT * FROM books WHERE author = ${BIND_PARAM}`;
      expect(() => query.bind("Blake", "Taylor")).toThrowError(
        "Expected 1 parameters to be bound, but got 2",
      );
    });

    it("should error when binding too few parameters", () => {
      const query = sql`SELECT * FROM books WHERE author = ${BIND_PARAM}`;
      expect(() => query.bind()).toThrowError(
        "Expected 1 parameters to be bound, but got 0",
      );
    });
  });

  describe("bulk", () => {
    it("should join nested list", () => {
      const query = bulk([
        [1, 2, 3],
        [5, 2, 3],
      ]);

      expect(query.text).toEqual("($1,$2,$3),($4,$5,$6)");
      expect(query.values).toEqual([1, 2, 3, 5, 2, 3]);
    });

    it("should error joining an empty list", () => {
      expect(() => bulk([])).toThrowError(TypeError);
    });

    it("should error joining an nested empty list", () => {
      expect(() => bulk([[]])).toThrowError(TypeError);
    });

    it("should error joining an nested non uniform list", () => {
      expect(() => bulk([[1, 2], [1, 3], [1]])).toThrowError(TypeError);
    });
  });
});
