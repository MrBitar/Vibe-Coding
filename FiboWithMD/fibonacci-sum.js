// fibonacci-sum.js
//
// This script calculates the sum of the first N numbers in the Fibonacci sequence.
// The Fibonacci sequence is a series of numbers where each number is the sum of the
// two numbers before it. It traditionally starts like this: 1, 1, 2, 3, 5, 8, 13, 21...
//
// Because Fibonacci numbers grow extremely fast (the 100th one is a 21-digit number),
// we use JavaScript's "BigInt" type instead of the normal "Number" type. A regular
// Number can only safely represent whole numbers up to about 9 quadrillion
// (Number.MAX_SAFE_INTEGER). BigInt has no such limit, so our math stays accurate
// no matter how large the numbers get. You write a BigInt by putting an "n" after
// a whole number, like this: 5n instead of 5.

/**
 * Generates the first `count` numbers of the Fibonacci sequence and returns
 * both the list of numbers and their total sum.
 *
 * @param {number} count - How many Fibonacci numbers to generate (e.g. 5 or 100).
 * @returns {{ sequence: bigint[], sum: bigint }} An object containing:
 *   - sequence: an array holding every Fibonacci number that was generated, in order.
 *   - sum: the total you get from adding all of those numbers together.
 */
function sumOfFibonacci(count) {
  // "sequence" is an empty list (array) where we will store each Fibonacci
  // number as we calculate it, one at a time.
  const sequence = [];

  // "sum" keeps a running total of every number we add to the sequence.
  // We start it at 0n (BigInt zero) because nothing has been added yet.
  let sum = 0n;

  // "previous" and "current" represent the two most recent Fibonacci numbers.
  // We start with the traditional first two Fibonacci numbers: 1 and 1.
  let previous = 0n; // This will act as "the number before the first number" (a helper value).
  let current = 1n;  // This is the actual first Fibonacci number.

  // This loop runs once for every number we want to generate.
  // "i" counts from 0 up to (but not including) "count".
  for (let i = 0; i < count; i++) {
    // Add the current Fibonacci number to our list.
    sequence.push(current);

    // Add the current Fibonacci number to our running total.
    sum += current;

    // Calculate the NEXT Fibonacci number by adding the previous two together.
    const next = previous + current;

    // Shift our two "tracking" values forward by one step:
    // what used to be "current" becomes "previous",
    // and the newly calculated "next" becomes "current".
    previous = current;
    current = next;
  }

  // Send back both the full list of numbers and the total sum.
  return { sequence, sum };
}

// ---------------------------------------------------------------------------
// SMALL TEST RUN (5 numbers)
// ---------------------------------------------------------------------------
// Before running the full calculation for 100 numbers, we first test our
// function on a much smaller amount (5 numbers). This lets us visually
// confirm the logic is correct before trusting it with a bigger job.
//
// The first 5 Fibonacci numbers should be: 1, 1, 2, 3, 5
// Their sum should be: 1 + 1 + 2 + 3 + 5 = 12
const testResult = sumOfFibonacci(5);
console.log("---- Small test run (first 5 numbers) ----");
console.log("Sequence:", testResult.sequence.map(String).join(", "));
console.log("Sum:", testResult.sum.toString());
console.log();

// ---------------------------------------------------------------------------
// FULL RUN (100 numbers)
// ---------------------------------------------------------------------------
// Now that we've confirmed the small test looks correct, we run the full
// calculation for the first 100 Fibonacci numbers.
const fullResult = sumOfFibonacci(100);
console.log("---- Full run (first 100 numbers) ----");
console.log("Sum of first 100 Fibonacci numbers:");
console.log(fullResult.sum.toString());
