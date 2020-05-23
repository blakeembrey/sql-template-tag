import bytes from "bytes";

const before = process.memoryUsage();
console.log(`before: ${bytes(before.heapUsed)} / ${bytes(before.heapTotal)}`);

const data = Array.from({ length: 10000 }, () => {
  return {
    text: "this $1 some other $2",
    values: ["is", 123],
  };
});

const after = process.memoryUsage();
console.log(`after: ${bytes(after.heapUsed)} / ${bytes(after.heapTotal)}`);
console.log(`after difference: ${bytes(after.heapUsed - before.heapUsed)}`);
