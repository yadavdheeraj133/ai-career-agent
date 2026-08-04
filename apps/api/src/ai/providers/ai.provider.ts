
export interface AIRequest {
    systemPrompt?: string;
    userPrompt : string;
    temperature? : number;
    maxTokens?: number
}

export interface AIResponse {
    content  : string;
    model: string;
}

export interface AIProvider  {
    generate(request : AIRequest):Promise<AIResponse>;
}