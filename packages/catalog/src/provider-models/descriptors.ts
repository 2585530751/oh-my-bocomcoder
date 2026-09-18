/**
 * Runtime model-manager factories for catalog providers. Everything else a
 * provider entry carries — default model, env keys, discovery wiring, seed
 * rows — is authored in `src/compat/rules/providers/<id>.kdl` and read from
 * the compiled entry (`src/compat/providers.ts`); this table holds only the
 * code half.
 *
 * BocomCoder: All built-in providers removed. Models come exclusively from
 * user config (~/.bocomcoder/agent/models.json) and runtime discovery.
 */
import type { KnownProvider } from "../compat/provider-ids";
import type { ProviderDescriptor } from "./descriptor-types";

export type { KnownProvider } from "../compat/provider-ids";

/**
 * Runtime model-discovery descriptors: every catalog provider with a
 * model-manager factory, paired with its compiled KDL entry.
 *
 * BocomCoder: kept empty — no built-in provider discovery. Models come
 * exclusively from user config and runtime discovery.
 */
export const PROVIDER_DESCRIPTORS: readonly ProviderDescriptor[] = [];

/** Default model IDs for all known providers, from their KDL entries. */
export const DEFAULT_MODEL_PER_PROVIDER: Readonly<Record<KnownProvider, string>> = Object.freeze(
	{},
) as Readonly<Record<KnownProvider, string>>;
