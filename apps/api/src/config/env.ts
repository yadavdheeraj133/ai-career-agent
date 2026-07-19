import dotenv from 'dotenv';

dotenv.config();

const requiredenv = ['PORT'] as const;

for(const key of requiredenv) {
   
    if(!process.env[key]){
        throw new Error(`Missing required environment variable: ${key}`);
    }

}

export const env = {
    PORT : process.env.PORT!
}