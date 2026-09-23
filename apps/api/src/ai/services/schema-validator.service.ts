/**
 * ------------------------------------------------------------------
 * Schema Validator Service
 * ------------------------------------------------------------------
 * Validates parsed AI output against its response schema.
 *
 * A model that returns syntactically-valid JSON that violates the schema is an
 * internal failure (the API is not at fault), so ZodError is translated into a
 * plain Error. That keeps validation errors from the request validators mapped
 * to 400 by the error middleware while AI response mismatches surface as 500.
 * ------------------------------------------------------------------
 */
import { ZodError } from "zod";

export class SchemaValidatorService {
  validate<T>(schema: {
    parse: (data: unknown) => T;
  }, data: unknown): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new Error(
          "AI response does not match the expected schema."
        );
      }

      throw error;
    }
  }
}

export const schemaValidator = new SchemaValidatorService();