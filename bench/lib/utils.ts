/**
 * This function performs a workload that is representative of a real-world application.
 */
export function performWorkload() {
  const arr = Array.from({ length: 100_000 }, (_, i) => i);

  const result = arr
    .filter((x) => x % 2 === 0)
    .map((x) => ({ value: x * 3 }))
    .reduce((acc, curr) => acc + curr.value, 0);

  return result;
}
