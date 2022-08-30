/**
 * Values supported by SQL engine.
 */
export type Value = unknown;

/**
 * Supported value or SQL instance.
 */
export type RawValue = Value | Sql;

/**
 * A SQL instance can be nested within each other to build SQL strings.
 */
export class Sql {
  values: Value[];
  strings: string[];

  constructor(
    rawStrings: ReadonlyArray<string>,
    rawValues: ReadonlyArray<RawValue>
  ) {
    if (rawStrings.length - 1 !== rawValues.length) {
      if (rawStrings.length === 0) {
        throw new TypeError("Expected at least 1 string");
      }

      throw new TypeError(
        `Expected ${rawStrings.length} strings to have ${
          rawStrings.length - 1
        } values`
      );
    }

    const valuesLength = rawValues.reduce<number>(
      (len, value) => len + (value instanceof Sql ? value.values.length : 1),
      0
    );

    this.values = new Array(valuesLength);
    this.strings = new Array(valuesLength + 1);

    this.strings[0] = rawStrings[0];

    // Iterate over raw values, strings, and children. The value is always
    // positioned between two strings, e.g. `index + 1`.
    let i = 0,
      pos = 0;
    while (i < rawValues.length) {
      const child = rawValues[i++];
      const rawString = rawStrings[i];

      // Check for nested `sql` queries.
      if (child instanceof Sql) {
        // Append child prefix text to current string.
        this.strings[pos] += child.strings[0];

        let childIndex = 0;
        while (childIndex < child.values.length) {
          this.values[pos++] = child.values[childIndex++];
          this.strings[pos] = child.strings[childIndex];
        }

        // Append raw string to current string.
        this.strings[pos] += rawString;
      } else {
        this.values[pos++] = child;
        this.strings[pos] = rawString;
      }
    }
  }

  get text() {
    let i = 1,
      value = this.strings[0];
    while (i < this.strings.length) value += `$${i}${this.strings[i++]}`;
    return value;
  }

  get sql() {
    let i = 1,
      value = this.strings[0];
    while (i < this.strings.length) value += `?${this.strings[i++]}`;
    return value;
  }

  inspect() {
    return {
      text: this.text,
      sql: this.sql,
      values: this.values,
    };
  }
}

/**
 * Create a SQL query for a list of values.
 */
export function join(
  values: RawValue[],
  separator = ",",
  prefix = "",
  suffix = ""
) {
  if (values.length === 0) {
    throw new TypeError(
      "Expected `join([])` to be called with an array of multiple elements, but got an empty array"
    );
  }

  return new Sql(
    [prefix, ...Array(values.length - 1).fill(separator), suffix],
    values
  );
}

/**
 * Create a SQL query for a list of structred values. Very useful for bulk
 * inserts.
 */
export function joinNested(values: Array<RawValue[]>, separator = ",") {
  if (values.length === 0) {
    throw new TypeError(
      "Expected `joinNested([][])` to be called with an array of multiple elements, but got an empty array"
    );
  }

  const len = values[0].length;

  if (len === 0) {
    throw new TypeError(
      "Expected `joinNested([][])` to be called with an nested array of multiple elements, but got an empty array"
    );
  }

  const v = values.map((x, index) => {
    if (x.length !== len) {
      throw new TypeError(
        `Expected joinNested([][${len}]) instead param at index ${index} had a length of ${x.length}`
      );
    }

    return new Sql(["(", ...Array(x.length - 1).fill(separator), ")"], x);
  });

  return new Sql(["", ...Array(v.length - 1).fill(separator), ""], v);
}

/**
 * Create raw SQL statement.
 */
export function raw(value: string) {
  return new Sql([value], []);
}

/**
 * Placeholder value for "no text".
 */
export const empty = raw("");

/**
 * Create a SQL object from a template string.
 */
export default function sql(
  strings: ReadonlyArray<string>,
  ...values: RawValue[]
) {
  return new Sql(strings, values);
}
