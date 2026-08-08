import type { KnownProvider } from "@oh-my-pi/pi-catalog";
import { litellmProvider } from "./litellm";
import { ollamaCloudProvider } from "./ollama-cloud";
import { ollamaProvider } from "./ollama";
import { openaiProvider } from "./openai";
import { openrouterProvider } from "./openrouter";
import type { ProviderDefinition } from "./types";

/**
 * The single per-provider list. Adding a provider = create `./providers/<id>.ts`
 * and add its export here. Every legacy structure (`KnownProvider`/`OAuthProvider`
 * unions, descriptors, env map, login list, refresh/login dispatch, CLI callback
 * maps) is derived from this registry. Order matches the interactive `/login`
 * list for the loginable providers; non-login model providers are appended.
 *
 * BocomCoder: Stripped to only openai/ollama/openrouter/litellm providers.
 */
const ALL = [
	ollamaProvider,
	ollamaCloudProvider,
	openrouterProvider,
	litellmProvider,
	openaiProvider,
];

export type RegistryDef = (typeof ALL)[number];
export const PROVIDER_REGISTRY: readonly ProviderDefinition[] = ALL;

const BY_ID = new Map<string, ProviderDefinition>(ALL.map(p => [p.id, p] as [string, ProviderDefinition]));

export function getProviderDefinition(id: string): ProviderDefinition | undefined {
	return BY_ID.get(id);
}

/** Compile-time completeness: every catalog chat-model provider must have a registry definition. */
type _MissingCatalogProviders = Exclude<KnownProvider, RegistryDef["id"]>;
type _CheckRegistryComplete = _MissingCatalogProviders extends never
	? true
	: ["registry is missing catalog providers", _MissingCatalogProviders];
true satisfies _CheckRegistryComplete;

/** Loginable providers (those carrying a `login` flow). */
export type OAuthProviderUnion = Extract<RegistryDef, { login: object }>["id"];
