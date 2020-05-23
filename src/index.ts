import { inspect } from "util";

export type Value = string | number | boolean | object | null | undefined;
export type RawValue = Value | Sql;

/**
 * A SQL instance can be nested within each other to build SQL strings.
 */
export class Sql {
  private rawStrings: Array<string>;
  private rawValues: Array<RawValue>;
  constructor(
    rawStrings: ReadonlyArray<string>,
    rawValues: ReadonlyArray<RawValue>
  ) {
    if (rawStrings.length === 0) {
      throw new TypeError("Expected at least 1 string");
    }

    if (rawStrings.length - 1 !== rawValues.length) {
      throw new TypeError(
        `Expected ${rawStrings.length} strings to have ${
          rawStrings.length - 1
        } values`
      );
    }

    this.rawStrings = [];
    this.rawValues = [];

    if (rawValues.length === 0) {
      this.rawStrings = rawStrings.slice(0);
      return;
    }

    this.rawStrings.length = rawStrings.length;

    if (rawValues.length) {
      this.rawValues.length = rawValues.length;

      for (let child of rawValues) {
        if (child instanceof Sql) {
          this.rawStrings.length += child.strings.length;
          this.rawValues.length += child.values.length - 1;
        }
      }
    }
    this.rawStrings[0] = rawStrings[0];

    let i = 1;
    let strIn = 1;
    for (; i < rawStrings.length; ++i) {
      const rawString = rawStrings[i];
      const child = rawValues[i - 1];

      // check for type
      if (child instanceof Sql) {
        const len = child.values.length;
        // concat beginning
        this.rawStrings[strIn - 1] += child.strings[0];

        for (let d = 0; d < len; ++d) {
          this.rawStrings[strIn] = child.strings[d + 1];
          this.rawValues[strIn - 1] = child.values[d];
          strIn++;
        }

        // set current
        this.rawStrings[strIn - 1] += rawString;
      } else {
        this.rawStrings[strIn] = rawString;
        this.rawValues[strIn - 1] = child;
        ++strIn;
      }
    }

    this.rawStrings.length = strIn;
    this.rawValues.length = strIn - 1;
  }

  get values(): Value[] {
    return this.rawValues;
  }

  get strings(): string[] {
    return this.rawStrings;
  }

  get text() {
    return this.strings.reduce(
      (text, part, index) => `${text}$${index}${part}`
    );
  }

  get sql() {
    return this.strings.join("?");
  }

  [inspect.custom]() {
    return {
      text: this.text,
      sql: this.sql,
      values: this.values,
    };
  }
}

// Work around MySQL enumerable keys in issue #2.
Object.defineProperty(Sql.prototype, "text", { enumerable: true });
Object.defineProperty(Sql.prototype, "values", { enumerable: true });
Object.defineProperty(Sql.prototype, "sql", { enumerable: true });

/**
 * Create a SQL query for a list of values.
 */
export function join(values: RawValue[], separator = ",") {
  if (values.length === 0) {
    throw new TypeError(
      "Expected `join([])` to be called with an array of multiple elements, but got an empty array"
    );
  }

  return new Sql(["", ...Array(values.length - 1).fill(separator), ""], values);
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
export function sqltag(strings: TemplateStringsArray, ...values: RawValue[]) {
  return new Sql(strings.raw, values);
}

/**
 * Standard `sql` tag.
 */
export default sqltag;
