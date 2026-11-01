import { createOpenAI } from '@ai-sdk/openai';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateText, streamText } from 'ai';
import { AppSettingsService } from '../app-settings/app-settings.service';
import type { LlmRequest } from './types/llm-request.type';

@Injectable()
export class PolzaLlmService {
  private readonly llmBaseUrl: string;
  constructor(
    private readonly configService: ConfigService,
    private readonly appSettings: AppSettingsService,
  ) {
    this.llmBaseUrl = this.configService.getOrThrow<string>('POLZA_API_URL');
  }

  public async generateText(request: LlmRequest): Promise<string> {
    const options = await this.getOptions(request);
    const result = await generateText(options);

    this.validateCompletion(result.text, result.finishReason);

    return result.text;
  }

  public async streamText(request: LlmRequest): Promise<string> {
    const options = await this.getOptions(request);
    const result = streamText(options);
    let text = '';

    for await (const part of result.stream) {
      if (part.type === 'error') {
        throw part.error instanceof Error
          ? part.error
          : new Error('Polza text stream failed');
      }

      if (part.type === 'abort') {
        throw new Error('Polza text stream was aborted');
      }

      if (part.type === 'text-delta') {
        text += part.text;
      }
    }

    this.validateCompletion(text, await result.finishReason);

    return text;
  }

  private async getOptions(request: LlmRequest) {
    const apiKey = await this.appSettings.getEffectivePolzaApiKey(
      this.configService.get<string>('POLZA_API_KEY'),
    );

    if (!apiKey) {
      throw new Error(
        'Polza.AI API key is not configured. Add one in Settings or configure POLZA_API_KEY.',
      );
    }

    const provider = createOpenAI({
      baseURL: this.llmBaseUrl,
      apiKey,
    });

    return {
      model: provider.chat(request.model),
      system: request.system,
      prompt: request.prompt,
      temperature: request.temperature,
      abortSignal: request.abortSignal,
      maxRetries: 5,
      providerOptions: {
        openai: { reasoningEffort: request.reasoningEffort },
      },
    };
  }

  private validateCompletion(text: string, finishReason: string): void {
    if (!text.trim() || finishReason !== 'stop') {
      throw new Error(
        `Incomplete Polza response (finish reason: ${finishReason})`,
      );
    }
  }
}
