import dotenv from 'dotenv';

dotenv.config();

const requiredenv = ['PORT', 'DATABASE_URL', 'JWT_SECRET'] as const;

for(const key of requiredenv) {
   
    if(!process.env[key]){
        throw new Error(`Missing required environment variable: ${key}`);
    }

}

const nodeEnv = process.env.NODE_ENV ?? "development";

if (nodeEnv === "production" && !process.env.COOKIE_SECRET) {
    throw new Error("Missing required environment variable: COOKIE_SECRET (required in production)");
}

if (process.env.COOKIE_SECRET && process.env.COOKIE_SECRET.length < 32) {
    throw new Error("COOKIE_SECRET must be at least 32 characters long");
}

export const env = {
    PORT : process.env.PORT!,
    DATABASE_URL : process.env.DATABASE_URL!,
    JWT_SECRET : process.env.JWT_SECRET!,
    COOKIE_SECRET : process.env.COOKIE_SECRET ?? "dev-only-cookie-secret-do-not-use-in-production-000000",
    CORS_ORIGIN : process.env.CORS_ORIGIN ?? "",
    NODE_ENV : nodeEnv,
    LINKEDIN_CLIENT_ID : process.env.LINKEDIN_CLIENT_ID ?? "",
    LINKEDIN_CLIENT_SECRET : process.env.LINKEDIN_CLIENT_SECRET ?? "",
    LINKEDIN_REDIRECT_URI : process.env.LINKEDIN_REDIRECT_URI ?? "",
    FRONTEND_URL : process.env.FRONTEND_URL ?? "http://localhost:3000",
}