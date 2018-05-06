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
import { sqltag, empty, join, raw } from 'sql-template-tag'

const query = sql`SELECT * FROM books WHERE id = ${id}`

query.sql //=> "SELECT * FROM books WHERE id = ?"
query.text //=> "SELECT * FROM books WHERE id = $1"
query.values //=> [id]

pg.query(query) // Uses `text` and `values`.
mysql.query(query) // Uses `sql` and `values`.

// Embed SQL instances inside SQL instances.
const subquery = sqltag`SELECT id FROM authors WHERE name = ${'Blake'}`
const query = sqltag`SELECT * FROM books WHERE author_id IN (${subquery})`

// Join and "empty" helpers (useful for nested queries).
sqltag`SELECT * FROM books ${hasIds ? sql`WHERE ids IN (${join(ids)})` : empty}`
```

## Related

* [`sql-template-strings`](https://github.com/felixfbecker/node-sql-template-strings)
* [`pg-template-tag`](https://github.com/XeCycle/pg-template-tag)

The main difference between this module and others is first-class TypeScript. There's also the `raw`, `join` and `empty` helpers. Specific differences are documented below:

**`sql-template-strings`**

Promotes mutation via chained methods and lacks nesting SQL statements. The idea to support both `sql` and `test` for `mysql` and `pg` compatibility came from here.

**`pg-template-tag`**

Missing TypeScript and MySQL support. This is the API I envisioned before starting development and, by supporting `pg` only, it has the ability to [dedupe `values`](https://github.com/XeCycle/pg-template-tag/issues/5#issuecomment-386875336). Supporting MySQL makes deduping impossible, because of `?` placeholders instead of `$<num>`, so I decided that was a premature optimisation here and opted to keep `mysql` support here instead.

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
