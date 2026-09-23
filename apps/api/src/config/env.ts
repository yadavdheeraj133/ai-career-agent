import dotenv from 'dotenv';

dotenv.config();

const requiredenv = ['PORT', 'DATABASE_URL', 'JWT_SECRET'] as const;

for(const key of requiredenv) {
   
    if(!process.env[key]){
        throw new Error(`Missing required environment variable: ${key}`);
    }

}

export const env = {
    PORT : process.env.PORT!,
    DATABASE_URL : process.env.DATABASE_URL!,
    JWT_SECRET : process.env.JWT_SECRET!,
    CORS_ORIGIN : process.env.CORS_ORIGIN ?? "",
    NODE_ENV : process.env.NODE_ENV ?? "development",
    LINKEDIN_CLIENT_ID : process.env.LINKEDIN_CLIENT_ID ?? "",
    LINKEDIN_CLIENT_SECRET : process.env.LINKEDIN_CLIENT_SECRET ?? "",
    LINKEDIN_REDIRECT_URI : process.env.LINKEDIN_REDIRECT_URI ?? "",
    FRONTEND_URL : process.env.FRONTEND_URL ?? "http://localhost:3000",
}