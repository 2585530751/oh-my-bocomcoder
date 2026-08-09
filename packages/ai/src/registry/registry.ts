/**
 * The single per-provider list. Adding a provider = create `./providers/<id>.ts`
 * and add its export here. Every legacy structure (`KnownProvider`/`OAuthProvider`
 * unions, descriptors, env map, login list, refresh/login dispatch, CLI callback
 * maps) is derived from this registry. Order matches the interactive `/login`
 * list for the loginable providers; non-login model providers are appended.
 *
 * BocomCoder: All built-in providers removed. Custom providers are loaded
 * independently from ~/.bocomcoder/agent/models.json via model-registry.
 */
import type { KnownProvider } from "@oh-my-pi/pi-catalog";
import type { ProviderDefinition } from "./types";

const ALL: readonly ProviderDefinition[] = [];

export type RegistryDef = (typeof ALL)[number];
export const PROVIDER_REGISTRY: readonly ProviderDefinition[] = ALL;

const BY_ID = new Map<string, ProviderDefinition>(ALL.map(p => [p.id, p] as [string, ProviderDefinition]));

export function getProviderDefinition(id: string): ProviderDefinition | undefined {
	return BY_ID.get(id);
}

// BocomCoder: compile-time completeness check removed (no built-in providers remain;
// KnownProvider is now string, making the Exclude check meaningless).

/** Loginable providers (those carrying a `login` flow). */
export type OAuthProviderUnion = Extract<RegistryDef, { login: object }>["id"];
