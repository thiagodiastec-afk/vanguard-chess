/** Observation is optional: a provider must not stall authenticated traffic. */
export async function withAttestationDeadline<T>(operation: () => Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      Promise.resolve().then(operation),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('ATTESTATION_TIMEOUT')), 250);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
