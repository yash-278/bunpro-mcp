import { setTimeout as delay } from "node:timers/promises";
import { BunproError } from "./errors.js";

export interface BunproRequestGateOptions {
  maximumConcurrent: number;
  maximumQueued: number;
  minimumStartIntervalMs?: number;
}

export const BUNPRO_REQUEST_BUDGET: Readonly<Required<BunproRequestGateOptions>> = {
  maximumConcurrent: 4,
  maximumQueued: 6,
  minimumStartIntervalMs: 2_000
};

export class BunproRequestGate {
  readonly #maximumConcurrent: number;
  readonly #maximumQueued: number;
  readonly #minimumStartIntervalMs: number;
  readonly #queue: Array<() => void> = [];
  #active = 0;
  #nextStartAt = 0;

  constructor(options: BunproRequestGateOptions) {
    if (!Number.isInteger(options.maximumConcurrent) || options.maximumConcurrent < 1) {
      throw new TypeError("maximumConcurrent must be a positive integer.");
    }
    if (!Number.isInteger(options.maximumQueued) || options.maximumQueued < 0) {
      throw new TypeError("maximumQueued must be a non-negative integer.");
    }
    const minimumStartIntervalMs = options.minimumStartIntervalMs ?? 0;
    if (!Number.isFinite(minimumStartIntervalMs) || minimumStartIntervalMs < 0) {
      throw new TypeError("minimumStartIntervalMs must be a non-negative finite number.");
    }
    this.#maximumConcurrent = options.maximumConcurrent;
    this.#maximumQueued = options.maximumQueued;
    this.#minimumStartIntervalMs = minimumStartIntervalMs;
  }

  async run<T>(operation: () => Promise<T>, signal: AbortSignal): Promise<T> {
    if (signal.aborted) throw deadlinePassed(signal.reason);
    if (this.#active >= this.#maximumConcurrent) {
      if (this.#queue.length >= this.#maximumQueued) {
        throw new BunproError(
          "BUNPRO_BUSY",
          "The Bunpro request budget is currently full. Wait briefly before trying again."
        );
      }
      await this.#waitInQueue(signal);
    }

    this.#active += 1;
    try {
      const now = performance.now();
      const startAt = Math.max(now, this.#nextStartAt);
      this.#nextStartAt = startAt + this.#minimumStartIntervalMs;
      const waitMs = startAt - now;
      if (waitMs > 0) {
        await delay(waitMs, undefined, { signal }).catch((error: unknown) => {
          throw deadlinePassed(error);
        });
      }
      return await operation();
    } finally {
      this.#active -= 1;
      this.#queue.shift()?.();
    }
  }

  #waitInQueue(signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const admit = (): void => {
        signal.removeEventListener("abort", leave);
        resolve();
      };
      const leave = (): void => {
        this.#queue.splice(this.#queue.indexOf(admit), 1);
        reject(deadlinePassed(signal.reason));
      };
      this.#queue.push(admit);
      signal.addEventListener("abort", leave, { once: true });
    });
  }
}

function deadlinePassed(cause: unknown): BunproError {
  return new BunproError(
    "BUNPRO_UPSTREAM_UNAVAILABLE",
    "The Bunpro request did not start before the operation deadline. Try again later.",
    { cause }
  );
}

export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export function apiTokenFromEnvironment(environment: NodeJS.ProcessEnv = process.env): string {
  const token = environment.BUNPRO_API_TOKEN?.trim();
  if (!token) {
    throw new BunproError(
      "BUNPRO_CONFIG_MISSING",
      "Set BUNPRO_API_TOKEN in the MCP host's secret environment configuration."
    );
  }
  return validateApiToken(token);
}

export function validateApiToken(token: string): string {
  const normalized = token.trim();
  if (!normalized || normalized.length > 2048 || /[\s\r\n]/.test(normalized)) {
    throw new BunproError(
      "BUNPRO_CONFIG_MISSING",
      "The Bunpro Account API Token is missing or malformed."
    );
  }
  return normalized;
}
