# SQL Template Tag

[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][downloads-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]

> ES2015 tagged template string for preparing SQL statements, works with [`pg`](https://www.npmjs.com/package/pg) and [`mysql`](https://www.npmjs.com/package/mysql).

## Installation

```
npm install sql-template-tag --save
```

## Usage

```ts
import sql, { empty, join, raw } from "sql-template-tag";

const query = sql`SELECT * FROM books WHERE id = ${id}`;

query.sql; //=> "SELECT * FROM books WHERE id = ?"
query.text; //=> "SELECT * FROM books WHERE id = $1"
query.values; //=> [id]

pg.query(query); // Uses `text` and `values`.
mysql.query(query); // Uses `sql` and `values`.

// Embed SQL instances inside SQL instances.
const nested = sql`SELECT id FROM authors WHERE name = ${"Blake"}`;
const query = sql`SELECT * FROM books WHERE author_id IN (${nested})`;

// Join and "empty" helpers (useful for nested queries).
sql`SELECT * FROM books ${hasIds ? sql`WHERE ids IN (${join(ids)})` : empty}`;
```

### Join

Accepts an array of values and returns a SQL instance with the values joined by the separator. E.g.

```js
const query = join([1, 2, 3]);

query.sql; //=> "?, ?, ?"
query.values; //=> [1, 2, 3]
```

### Raw

Accepts a string and returns a SQL instance, useful if you want some part of the SQL to be dynamic.

```js
raw("SELECT"); // == sql`SELECT`
```

**Do not** accept user input to `raw`, this will create a SQL injection vulnerability.

### Empty

Simple placeholder value for an empty SQL string. Equivalent to `raw("")`.

## Related

Some other modules exist that do something similar:

- [`sql-template-strings`](https://github.com/felixfbecker/node-sql-template-strings): promotes mutation via chained methods and lacks nesting SQL statements. The idea to support `sql` and `text` properties for dual `mysql` and `pg` compatibility came from here.
- [`pg-template-tag`](https://github.com/XeCycle/pg-template-tag): missing TypeScript and MySQL support. This is the API I envisioned before writing this library, and by supporting `pg` only it has the ability to [dedupe `values`](https://github.com/XeCycle/pg-template-tag/issues/5#issuecomment-386875336).

## License

MIT

[npm-image]: https://img.shields.io/npm/v/sql-template-tag.svg?style=flat
[npm-url]: https://npmjs.org/package/sql-template-tag
[downloads-image]: https://img.shields.io/npm/dm/sql-template-tag.svg?style=flat
[downloads-url]: https://npmjs.org/package/sql-template-tag
[travis-image]: https://img.shields.io/travis/blakeembrey/sql-template-tag.svg?style=flat
[travis-url]: https://travis-ci.org/blakeembrey/sql-template-tag
[coveralls-image]: https://img.shields.io/coveralls/blakeembrey/sql-template-tag.svg?style=flat
[coveralls-url]: https://coveralls.io/r/blakeembrey/sql-template-tag?branch=master
