/**
 * The provider catalog table: one entry per chat-model provider, carrying the
 * catalog half of what used to live in `@oh-my-pi/pi-ai`'s registry definitions
 * (default model, runtime model-manager factory, discovery wiring). The auth
 * half (env keys, OAuth login/refresh) stays in the pi-ai registry, which
 * type-checks itself against `KnownProvider` from this table.
 *
 * BocomCoder: Stripped to only openai/ollama/openrouter/litellm providers.
 */
import type { ModelManagerConfig, ProviderCatalogEntry, ProviderDescriptor } from "./descriptor-types";
import { ollamaCloudModelManagerOptions } from "./ollama";
import {
	litellmModelManagerOptions,
	ollamaModelManagerOptions,
	openaiModelManagerOptions,
	openrouterModelManagerOptions,
} from "./openai-compat";

export const CATALOG_PROVIDERS = [
	{
		id: "ollama",
		defaultModel: "gpt-oss:20b",
		envVars: ["OLLAMA_API_KEY"],
		createModelManagerOptions: (config: ModelManagerConfig) => ollamaModelManagerOptions(config),
		allowUnauthenticated: true,
	},
	{
		id: "ollama-cloud",
		defaultModel: "gpt-oss:120b",
		envVars: ["OLLAMA_CLOUD_API_KEY"],
		createModelManagerOptions: (config: ModelManagerConfig) => ollamaCloudModelManagerOptions(config),
		catalogDiscovery: { label: "Ollama Cloud", oauthProvider: "ollama-cloud" },
	},
	{
		id: "openai",
		defaultModel: "gpt-5.5",
		envVars: ["OPENAI_API_KEY"],
		createModelManagerOptions: (config: ModelManagerConfig) => openaiModelManagerOptions(config),
	},
	{
		id: "openrouter",
		defaultModel: "openai/gpt-5.5",
		envVars: ["OPENROUTER_API_KEY"],
		createModelManagerOptions: (config: ModelManagerConfig) => openrouterModelManagerOptions(config),
		catalogDiscovery: { label: "OpenRouter", allowUnauthenticated: true },
	},
	{
		id: "litellm",
		defaultModel: "claude-opus-4-8",
		envVars: ["LITELLM_API_KEY"],
		createModelManagerOptions: (config: ModelManagerConfig) => litellmModelManagerOptions(config),
		catalogDiscovery: { label: "LiteLLM", allowUnauthenticated: true },
	},
] as const satisfies readonly ProviderCatalogEntry[];

/** Chat-model providers — every entry in the catalog table. */
export type KnownProvider = (typeof CATALOG_PROVIDERS)[number]["id"];

/**
 * Runtime model-discovery descriptors: every catalog provider that exposes a
 * standard model-manager factory. Special-managed providers
 * (`google-antigravity`/`google-gemini-cli`/`openai-codex`) are built bespoke in
 * the coding-agent runtime and are excluded here.
 */
const CATALOG_ENTRY_LIST: readonly ProviderCatalogEntry[] = CATALOG_PROVIDERS;

export const PROVIDER_DESCRIPTORS: readonly ProviderDescriptor[] = CATALOG_ENTRY_LIST.flatMap(provider => {
	if (!provider.createModelManagerOptions || provider.specialModelManager) {
		return [];
	}
	return [
		{
			providerId: provider.id,
			defaultModel: provider.defaultModel,
			createModelManagerOptions: provider.createModelManagerOptions,
			allowUnauthenticated: provider.allowUnauthenticated,
			dynamicModelsAuthoritative: provider.dynamicModelsAuthoritative,
			catalogDiscovery: provider.catalogDiscovery
				? { ...provider.catalogDiscovery, envVars: provider.catalogDiscovery.envVars ?? provider.envVars ?? [] }
				: undefined,
		},
	];
});

/** Default model IDs for all known providers, derived from the catalog table. */
export const DEFAULT_MODEL_PER_PROVIDER: Record<KnownProvider, string> = Object.fromEntries(
	CATALOG_PROVIDERS.map(provider => [provider.id, provider.defaultModel] as [string, string]),
) as Record<KnownProvider, string>;

export function getCatalogProviderEntry(id: string): ProviderCatalogEntry | undefined {
	return CATALOG_PROVIDERS.find(provider => provider.id === id);
}
