import crypto from "node:crypto";
import { env } from "../config/env.js";
import { authRepository } from "../repositories/auth.repository.js";
import { generateToken } from "../utils/jwt.js";

const LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization";
const LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const LINKEDIN_USERINFO_URL = "https://api.linkedin.com/v2/userinfo";

interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
}

interface LinkedInUserInfo {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  email_verified?: boolean;
  picture?: string;
  locale?: string;
}

interface OAuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LinkedInAuthResult {
  user: OAuthUser;
  token: string;
  /** True only when this authentication created a brand-new user account. */
  isNewUser: boolean;
}

export class LinkedInService {
  private get config() {
    const hasPlaceholder = (value: string) =>
      !value.trim() || value.includes("your_linkedin_");

    if (
      hasPlaceholder(env.LINKEDIN_CLIENT_ID) ||
      hasPlaceholder(env.LINKEDIN_CLIENT_SECRET) ||
      hasPlaceholder(env.LINKEDIN_REDIRECT_URI)
    ) {
      throw new Error(
        "LinkedIn OAuth is not configured. Set LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, and LINKEDIN_REDIRECT_URI environment variables."
      );
    }
    return {
      clientId: env.LINKEDIN_CLIENT_ID,
      clientSecret: env.LINKEDIN_CLIENT_SECRET,
      redirectUri: env.LINKEDIN_REDIRECT_URI,
    };
  }

  generateAuthUrl(): { url: string; state: string } {
    const state = crypto.randomBytes(32).toString("hex");
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: "openid profile email",
      state,
    });

    return {
      url: `${LINKEDIN_AUTH_URL}?${params.toString()}`,
      state,
    };
  }

  private async exchangeCode(code: string): Promise<LinkedInTokenResponse> {
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: this.config.redirectUri,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });

    const response = await fetch(LINKEDIN_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`LinkedIn token exchange failed: ${response.status} ${body}`);
    }

    return response.json() as Promise<LinkedInTokenResponse>;
  }

  private async fetchUserInfo(accessToken: string): Promise<LinkedInUserInfo> {
    const response = await fetch(LINKEDIN_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`LinkedIn userinfo request failed: ${response.status} ${body}`);
    }

    return response.json() as Promise<LinkedInUserInfo>;
  }

  private toOAuthUser(row: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): OAuthUser {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      avatarUrl: row.avatarUrl,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async handleCallback(code: string): Promise<LinkedInAuthResult> {
    const tokenResponse = await this.exchangeCode(code);
    const userInfo = await this.fetchUserInfo(tokenResponse.access_token);

    if (!userInfo.sub) {
      throw new Error("LinkedIn did not return a subject identifier");
    }

    if (!userInfo.email) {
      throw new Error(
        "LinkedIn did not return an email address. Ensure the 'email' scope is authorized in your LinkedIn app."
      );
    }

    const email = userInfo.email.toLowerCase();
    const name = [userInfo.given_name, userInfo.family_name]
      .filter(Boolean)
      .join(" ") || userInfo.name || "LinkedIn User";

    let oauthUser: OAuthUser | null = null;
    let isNewUser = false;

    const existingByProvider = await authRepository.findUserByProviderId("linkedin", userInfo.sub);

    if (existingByProvider) {
      if (userInfo.picture && existingByProvider.avatarUrl !== userInfo.picture) {
        const updated = await authRepository.linkProviderToUser(
          existingByProvider.id,
          "linkedin",
          userInfo.sub,
          userInfo.picture
        );
        oauthUser = updated
          ? this.toOAuthUser(updated)
          : this.toOAuthUser(existingByProvider);
      } else {
        oauthUser = this.toOAuthUser(existingByProvider);
      }
    } else {
      const existingByEmail = await authRepository.findUserByEmail(email);

      if (existingByEmail) {
        const updated = await authRepository.linkProviderToUser(
          existingByEmail.id,
          "linkedin",
          userInfo.sub,
          userInfo.picture
        );
        oauthUser = updated
          ? this.toOAuthUser(updated)
          : this.toOAuthUser({
              ...existingByEmail,
              avatarUrl: existingByEmail.avatarUrl ?? null,
            });
      } else {
        const created = await authRepository.createOAuthUser({
          name,
          email,
          provider: "linkedin",
          providerId: userInfo.sub,
          avatarUrl: userInfo.picture,
        });
        oauthUser = this.toOAuthUser(created);
        isNewUser = true;
      }
    }

    if (!oauthUser) {
      throw new Error("Failed to create or retrieve user after LinkedIn authentication");
    }

    const token = generateToken(oauthUser.id);

    return {
      user: oauthUser,
      token,
      isNewUser,
    };
  }
}

export const linkedinService = new LinkedInService();
