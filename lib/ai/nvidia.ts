/**
 * Shared NVIDIA API helper for fallback text generation.
 *
 * Two models are available:
 *  - 'phi-4'  -> microsoft/phi-4-mini-flash-reasoning  (feed, drafts, general)
 *  - 'mistral' -> mistralai/mistral-large-3-675b-instruct-2512 (meeting notes)
 */

const NVIDIA_MODELS = {
    'phi-4': 'microsoft/phi-4-mini-flash-reasoning',
    'mistral': 'mistralai/mistral-large-3-675b-instruct-2512',
    'kimi': 'moonshotai/kimi-k2-instruct-0905',
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
    const modelKey = options.model ?? 'phi-4';
    const modelId = NVIDIA_MODELS[modelKey];

    // Select API key based on model
    const apiKey = modelKey === 'mistral'
        ? process.env.NVIDIA_MISTRAL_API_KEY
        : modelKey === 'kimi'
            ? process.env.NVIDIA_KIMI_API_KEY
            : process.env.NVIDIA_API_KEY;

    if (!apiKey) {
        throw new Error(`${modelKey === 'mistral' ? 'NVIDIA_MISTRAL_API_KEY' : 'NVIDIA_API_KEY'} not configured`);
    }

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

    // Helper: try parsing a string as JSON
    const tryParse = (str: string): T | null => {
        try {
            const cleaned = str.trim();
            if (!cleaned) return null;
            return JSON.parse(cleaned);
        } catch {
            return null;
        }
    };

    // Stage 1: Look for JSON code blocks
    const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
    let cbMatch;
    while ((cbMatch = codeBlockRegex.exec(raw)) !== null) {
        const parsed = tryParse(cbMatch[1]);
        if (parsed) return parsed;
    }

    // Stage 2: Look for the LARGEST brace-enclosed block (likely the main JSON)
    const allMatches = [];
    let start = -1;
    let stack = 0;

    for (let i = 0; i < raw.length; i++) {
        if (raw[i] === '{') {
            if (stack === 0) start = i;
            stack++;
        } else if (raw[i] === '}') {
            stack--;
            if (stack === 0 && start !== -1) {
                allMatches.push(raw.substring(start, i + 1));
            } else if (stack < 0) {
                stack = 0; // reset on imbalance
            }
        }
    }

    // Try parsing matches from longest to shortest
    allMatches.sort((a, b) => b.length - a.length);
    for (const match of allMatches) {
        const parsed = tryParse(match);
        if (parsed) return parsed;
    }

    // Stage 3: Truncation recovery on the last promising block
    const lastBraceStart = raw.lastIndexOf('{');
    if (lastBraceStart !== -1) {
        let candidate = raw.substring(lastBraceStart).trim();
        // Basic truncation fixing (add missing braces/brackets)
        if (!candidate.endsWith('}')) {
            let attempt = candidate;
            if (!attempt.endsWith('"') && !attempt.endsWith(']') && !attempt.endsWith('}')) {
                attempt += '"';
            }
            if (attempt.split('[').length > attempt.split(']').length) attempt += ']';
            if (attempt.split('{').length > attempt.split('}').length) attempt += '}';

            const parsed = tryParse(attempt);
            if (parsed) return parsed;
        }
    }

    console.error('Failed to extract JSON from NVIDIA response. Raw content preview:', raw.substring(0, 1000) + '...');
    throw new Error(`Failed to extract JSON from NVIDIA response. Raw length: ${raw.length}`);
}
