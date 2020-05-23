import sql from "../dist";
import bytes from "bytes";

const before = process.memoryUsage();
console.log(`before: ${bytes(before.heapUsed)} / ${bytes(before.heapTotal)}`);

const data = Array.from({ length: 10000 }, () => {
  const other = sql`some other ${123}`;
  return sql`this ${"is"} ${other}`;
});

const after = process.memoryUsage();
console.log(`after: ${bytes(after.heapUsed)} / ${bytes(after.heapTotal)}`);
console.log(`after difference: ${bytes(after.heapUsed - before.heapUsed)}`);

const final = process.memoryUsage();
for (const value of data) {
  // Force computation.
  value.sql;
  value.values;
}

console.log(`final: ${bytes(final.heapUsed)} / ${bytes(final.heapTotal)}`);
console.log(`final difference: ${bytes(final.heapUsed - before.heapUsed)}`);
