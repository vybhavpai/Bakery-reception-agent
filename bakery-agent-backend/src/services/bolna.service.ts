export interface BolnaCallOptions {
  agentId: string;
  apiToken: string;
  recipientPhoneNumber: string;
  fromPhoneNumber?: string;
  scheduledAt?: string;
  userData?: Record<string, unknown>;
}

export interface BolnaCallResult {
  success: boolean;
  executionId?: string;
  status?: string;
  message?: string;
  rawResponse?: unknown;
}

/**
 * Service responsible for talking to the Bolna HTTP API.
 *
 * Docs: https://www.bolna.ai/docs/api-reference/calls/make
 * Endpoint: POST https://api.bolna.ai/call
 */
export class BolnaService {
  private readonly baseUrl: string;

  constructor(baseUrl = "https://api.bolna.ai") {
    this.baseUrl = baseUrl;
  }

  /**
   * Ensure phone number is in E.164 format.
   * If it does not start with '+', assume Indian numbers and prefix '+91'.
   */
  private normalizePhoneNumber(phone: string): string {
    if (!phone) return phone;
    const trimmed = phone.trim();
    if (trimmed.startsWith("+")) {
      return trimmed;
    }
    // Basic heuristic: treat as local Indian number and prefix +91
    return `+91${trimmed}`;
  }

  /**
   * Initiate a voice call via Bolna.
   */
  async initiateCall(options: BolnaCallOptions): Promise<BolnaCallResult> {
    const {
      agentId,
      apiToken,
      recipientPhoneNumber,
      fromPhoneNumber,
      scheduledAt,
      userData,
    } = options;

    if (!agentId) {
      throw new Error("Bolna agentId is required");
    }
    if (!apiToken) {
      throw new Error("Bolna API token is required");
    }
    if (!recipientPhoneNumber) {
      throw new Error("Recipient phone number is required");
    }

    const url = `${this.baseUrl}/call`;

    const body: Record<string, unknown> = {
      agent_id: agentId,
      recipient_phone_number: this.normalizePhoneNumber(recipientPhoneNumber),
    };

    if (fromPhoneNumber) {
      body.from_phone_number = this.normalizePhoneNumber(fromPhoneNumber);
    }
    if (scheduledAt) {
      body.scheduled_at = scheduledAt;
    }
    if (userData) {
      body.user_data = userData;
    }

    console.log("initiating call to bolna with body:", body);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();

    if (!response.ok) {
      // Try to parse error payload if possible
      let parsedError: any;
      try {
        parsedError = JSON.parse(text);
      } catch {
        parsedError = { message: text };
      }

      throw new Error(
        `Bolna API error (${response.status}): ${
          parsedError?.message || text || "Unknown error"
        }`
      );
    }

    let data: any;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }

    const result: BolnaCallResult = {
      success: true,
      executionId: data.execution_id,
      status: data.status,
      message: data.message,
      rawResponse: data,
    };

    return result;
  }
}

