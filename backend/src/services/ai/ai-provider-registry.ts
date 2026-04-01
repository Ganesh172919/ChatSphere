import { env } from "../../config/env";
import { AppError } from "../../helpers/app-error";
import { MockAIProvider } from "./mock-ai.provider";
import type { AIProvider } from "./types";

const providers: Record<string, AIProvider> = {
  mock: new MockAIProvider()
};

export const aiProviderRegistry = {
  resolve(): AIProvider {
    const provider = providers[env.AI_PROVIDER];
    if (!provider) {
      throw new AppError(500, "AI_PROVIDER_NOT_AVAILABLE", `AI provider '${env.AI_PROVIDER}' is not configured`);
    }

    return provider;
  }
};
