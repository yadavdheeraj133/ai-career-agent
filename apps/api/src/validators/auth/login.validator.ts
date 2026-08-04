import {z} from "zod"

export const loginSchema = z.object({
email : z
.email("Invalid email address")
.transform((email) => email.toLowerCase().trim()),

password : z
.string()
.min(8,"Password must be at least 8 characters.")
.max(32,"Password must be at most 32 characters.")
})

export type LoginInput = z.infer<typeof  loginSchema>;