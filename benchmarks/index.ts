import sql, { Sql } from "../src/index";
import bytes from "bytes";

const before = process.memoryUsage();
console.log(`before: ${bytes(before.heapUsed)} / ${bytes(before.heapTotal)}`);
const start = process.hrtime();

const queries: Sql[] = [];

for (let i = 0; i < 1_000_000; i++) {
  const subQuery = `something ${"goes"} here and ${"there"}`;
  const query = sql`this is ${"the"} query: ${i}, ${subQuery}`;
  queries.push(query);

  // Compute properties for perf testing.
  query.text;
  query.values;
}

const end = process.hrtime(start);
const after = process.memoryUsage();
console.log(`after: ${bytes(after.heapUsed)} / ${bytes(after.heapTotal)}`);
console.log(`difference: ${bytes(after.heapUsed - before.heapUsed)}`);
console.log(`time: ${end[0]}s ${~~(end[1] / 1000000)}ms`);
