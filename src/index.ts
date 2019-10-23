import { inspect } from "util";
import { cache } from "decorator-cache-getter";

export type Value = string | number | boolean | object | null | undefined;
export type RawValue = Value | Sql;

/**
 * A SQL instance can be nested within each other to build SQL strings.
 */
export class Sql {
  constructor(
    protected rawStrings: ReadonlyArray<string>,
    protected rawValues: ReadonlyArray<RawValue>
  ) {
    if (rawStrings.length === 0) {
      throw new TypeError("Expected at least 1 string");
    }

    if (rawStrings.length - 1 !== rawValues.length) {
      throw new TypeError(
        `Expected ${rawStrings.length} strings to have ${rawStrings.length -
          1} values`
      );
    }
  }

  @cache
  get values(): Value[] {
    const values: Value[] = [];

    for (const rawValue of this.rawValues) {
      if (rawValue instanceof Sql) {
        values.push(...rawValue.values);
      } else {
        values.push(rawValue);
      }
    }

    return values;
  }

  @cache
  get strings(): string[] {
    const strings: string[] = [this.rawStrings[0]];

    for (let i = 1; i < this.rawStrings.length; i++) {
      const child = this.rawValues[i - 1];

      if (child instanceof Sql) {
        // Concatenate previous and next texts with child SQL statement.
        strings[strings.length - 1] += child.strings[0];
        strings.push(...child.strings.slice(1));
        strings[strings.length - 1] += this.rawStrings[i];
      } else {
        strings.push(this.rawStrings[i]);
      }
    }

    return strings;
  }

  @cache
  get text() {
    return this.strings.reduce(
      (text, part, index) => `${text}$${index}${part}`
    );
  }

  @cache
  get sql() {
    return this.strings.join("?");
  }

  [inspect.custom]() {
    return {
      text: this.text,
      sql: this.sql,
      values: this.values
    };
  }
}

// Work around MySQL enumerable keys in issue #2.
Object.defineProperty(Sql.prototype, 'text', { enumerable: true })
Object.defineProperty(Sql.prototype, 'values', { enumerable: true })
Object.defineProperty(Sql.prototype, 'sql', { enumerable: true })

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
