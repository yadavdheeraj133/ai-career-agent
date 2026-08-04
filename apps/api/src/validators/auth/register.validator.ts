import {z} from 'zod';

export const registerSchema = z.object({
name : z
.string()
.trim()
.min(3,"Name atleat be 3 charaters long")  
.max(50,"Name must be less than 50 charaters long"),

email : z
.email("Invalid email address")
.transform((email) => email.toLowerCase().trim()),

password : z
.string()
.min(8, "Password must be at least 8 characters long")
.max(32, "Password must be less than 32 characters long")

})

export type RegisterInput = z.infer<typeof registerSchema >;