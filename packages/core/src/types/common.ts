/**
 * Common utility types used throughout QueryScape.
 */

/**
 * Result type for operations that can fail.
 * Inspired by Rust's Result<T, E>.
 */
export type Result<T, E = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/** Async version of Result */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/** Helper to create success result */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/** Helper to create error result */
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/** Utility type for making specific properties optional */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** Utility type for making specific properties required */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/** Deep readonly type */
export type DeepReadonly<T> = T extends (infer R)[]
  ? ReadonlyArray<DeepReadonly<R>>
  : T extends object
    ? { readonly [P in keyof T]: DeepReadonly<T[P]> }
    : T;
