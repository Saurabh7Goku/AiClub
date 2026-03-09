/**
 * Shared NVIDIA API helper for fallback text generation.
 *
 * Two models are available:
 *  - 'phi-4'  → microsoft/phi-4-mini-flash-reasoning  (feed, drafts, general)
 *  - 'mistral' → mistralai/mistral-large-3-675b-instruct-2512 (meeting notes)
 */

const NVIDIA_MODELS = {
    'phi-4': 'microsoft/phi-4-mini-flash-reasoning',
    'mistral': 'mistralai/mistral-large-3-675b-instruct-2512',
} as const;

export type NvidiaModelKey = keyof typeof NVIDIA_MODELS;

interface NvidiaOptions {
    /** Which NVIDIA model to use. Default: 'phi-4' */
    model?: NvidiaModelKey;
    /** Max tokens for response. Default: 2048 */
    maxTokens?: number;
    /** Temperature. Default: 0.15 */
    temperature?: number;
    /** Whether to stream the response. Default: false */
    stream?: boolean;
}

/**
 * Call the NVIDIA chat completions API and return the assistant's text reply.
 * Strips `<think>` reasoning tags that some models produce.
 */
export async function callNvidia(
    prompt: string,
    options: NvidiaOptions = {},
): Promise<string> {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) throw new Error('NVIDIA_API_KEY not configured');

    const modelKey = options.model ?? 'phi-4';
    const modelId = NVIDIA_MODELS[modelKey];

    const payload = {
        model: modelId,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options.maxTokens ?? 2048,
        temperature: options.temperature ?? 0.15,
        top_p: 1.0,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
        stream: false, // always non-stream for simplicity in fallback
    };

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(`NVIDIA API error ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    let content: string = data.choices?.[0]?.message?.content || '';

    // Strip <think> reasoning tags
    content = content.replace(/<think>[\s\S]*?<\/think>/g, '');
    content = content.replace(/<think>[\s\S]*/g, '');
    content = content.replace(/<\/think>/g, '');
    content = content.trim();

    return content;
}

/**
 * Call NVIDIA and parse the response as JSON.
 * Handles code-fenced JSON, brace extraction, and truncation recovery.
 */
export async function callNvidiaJSON<T = any>(
    prompt: string,
    options: NvidiaOptions = {},
): Promise<T> {
    const raw = await callNvidia(prompt, options);

    // Stage 1: code-fenced JSON
    const codeBlockMatch = raw.match(/```json\s?([\s\S]*?)\s?```/) || raw.match(/```\s?([\s\S]*?)\s?```/);
    if (codeBlockMatch) {
        try {
            return JSON.parse(codeBlockMatch[1].trim());
        } catch { /* continue */ }
    }

    // Stage 2: first/last brace pair
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    if (firstBrace !== -1) {
        let candidate = lastBrace > firstBrace
            ? raw.substring(firstBrace, lastBrace + 1)
            : raw.substring(firstBrace);

        // Truncation recovery
        if (!candidate.endsWith('}')) {
            candidate = candidate.trim();
            if (!candidate.endsWith(']')) candidate += '"]';
            if (!candidate.endsWith('}')) candidate += ']}';
        }

        try {
            return JSON.parse(candidate);
        } catch {
            try {
                return JSON.parse(candidate + '"]}');
            } catch { /* continue */ }
        }
    }

    // Stage 3: regex fallback
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try {
            return JSON.parse(jsonMatch[0]);
        } catch { /* continue */ }
    }

    throw new Error(`Failed to extract JSON from NVIDIA response. Raw length: ${raw.length}`);
}
