/**
 * A param that's expected to be bound later of included in `values`.
 */
export const BIND_PARAM = Symbol("BIND_PARAM");

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
  readonly bindParams = 0;
  readonly values: Value[];
  readonly strings: string[];

  constructor(rawStrings: readonly string[], rawValues: readonly RawValue[]) {
    if (rawStrings.length - 1 !== rawValues.length) {
      if (rawStrings.length === 0) {
        throw new TypeError("Expected at least 1 string");
      }

      throw new TypeError(
        `Expected ${rawStrings.length} strings to have ${
          rawStrings.length - 1
        } values`,
      );
    }

    const valuesLength = rawValues.reduce<number>(
      (len, value) => len + (value instanceof Sql ? value.values.length : 1),
      0,
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
          const value = child.values[childIndex++];
          const str = child.strings[childIndex];

          this.values[pos++] = value;
          this.strings[pos] = str;
          if (value === BIND_PARAM) this.bindParams++;
        }

        // Append raw string to current string.
        this.strings[pos] += rawString;
      } else {
        this.values[pos++] = child;
        this.strings[pos] = rawString;
        if (child === BIND_PARAM) this.bindParams++;
      }
    }
  }

  get sql() {
    const len = this.strings.length;
    let i = 1;
    let value = this.strings[0];
    while (i < len) value += `?${this.strings[i++]}`;
    return value;
  }

  get statement() {
    const len = this.strings.length;
    let i = 1;
    let value = this.strings[0];
    while (i < len) value += `:${i}${this.strings[i++]}`;
    return value;
  }

  get text() {
    const len = this.strings.length;
    let i = 1;
    let value = this.strings[0];
    while (i < len) value += `$${i}${this.strings[i++]}`;
    return value;
  }

  bind(...params: Value[]) {
    if (params.length !== this.bindParams) {
      throw new TypeError(
        `Expected ${this.bindParams} parameters to be bound, but got ${params.length}`,
      );
    }

    const values = new Array(this.values.length);

    for (let i = 0, j = 0; i < this.values.length; i++) {
      const value = this.values[i];
      values[i] = value === BIND_PARAM ? params[j++] : value;
    }

    return values;
  }

  inspect() {
    return {
      sql: this.sql,
      statement: this.statement,
      text: this.text,
      values: this.values,
    };
  }
}

/**
 * Create a SQL query for a list of values.
 */
export function join(
  values: readonly RawValue[],
  separator = ",",
  prefix = "",
  suffix = "",
) {
  if (values.length === 0) {
    throw new TypeError(
      "Expected `join([])` to be called with an array of multiple elements, but got an empty array",
    );
  }

  return new Sql(
    [prefix, ...Array(values.length - 1).fill(separator), suffix],
    values,
  );
}

/**
 * Create a SQL query for a list of structured values.
 */
export function bulk(
  data: ReadonlyArray<ReadonlyArray<RawValue>>,
  separator = ",",
  prefix = "",
  suffix = "",
) {
  const length = data.length && data[0].length;

  if (length === 0) {
    throw new TypeError(
      "Expected `bulk([][])` to be called with a nested array of multiple elements, but got an empty array",
    );
  }

  const values = data.map((item, index) => {
    if (item.length !== length) {
      throw new TypeError(
        `Expected \`bulk([${index}][])\` to have a length of ${length}, but got ${item.length}`,
      );
    }

    return new Sql(["(", ...Array(item.length - 1).fill(separator), ")"], item);
  });

  return new Sql(
    [prefix, ...Array(values.length - 1).fill(separator), suffix],
    values,
  );
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
  strings: readonly string[],
  ...values: readonly RawValue[]
) {
  return new Sql(strings, values);
}
