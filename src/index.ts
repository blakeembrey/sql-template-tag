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

    this.rawStrings[0] = rawStrings[0];

    let i = 1;
    let strIn = 1;
    let valIn = 0;
    for (; i < rawStrings.length; ++i, ++strIn) {
      const rawString = rawStrings[i];
      const rawValue = rawValues[i - 1];

      // check for type
      if (rawValue instanceof Sql) {
        const strings = rawValue.strings;
        const values = rawValue.values;
        const len = strings.length;
        // concat beginning
        this.rawStrings[strIn - 1] = this.rawStrings[strIn - 1] || "";
        this.rawStrings[strIn - 1] += strings[0];

        if (len !== 1) {
          for (let d = 1; d < len - 1; ++d) {
            this.rawStrings[strIn++] = strings[d];
            this.rawValues[valIn++] = values[d - 1];
          }

          this.rawValues[valIn++] = values[len - 2];

          // set current
          this.rawStrings[strIn] = strings[len - 1] + rawString;
        } else {
          // concat everything
          this.rawStrings[strIn - 1] += rawString;
          --strIn;
        }
      } else {
        this.rawStrings[strIn] = rawString;
        this.rawValues[valIn++] = rawValue;
      }
    }
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
