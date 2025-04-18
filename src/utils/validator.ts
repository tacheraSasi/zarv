import 'ses';
import { z } from 'zod';

// Initialize SES lockdown for secure evaluation
lockdown({ errorTaming: 'unsafe' });

interface ValidationResult {
  isValid: boolean;
  errors: Array<{ path: string[]; message: string }>;
}

/**
 * Validates API response data against a Zod schema
 * @param schemaCode The Zod schema code as a string
 * @param responseData The API response data to validate
 * @param zodVersion The version of Zod to use (currently only affects display)
 * @returns Validation result with success status and any errors
 */
export const validateWithZod = (
  schemaCode: string,
  responseData: any,
  zodVersion: string = '3.24.2'
): ValidationResult => {
  try {
    // Create a secure compartment for evaluating the schema
    const compartment = new Compartment({
      z,
      console,
    });

    // Wrap the schema code in a function that returns the schema
    const wrappedCode = `
      (function() {
        try {
          const schema = ${schemaCode};
          return schema;
        } catch (error) {
          throw new Error('Invalid schema: ' + error.message);
        }
      })()
    `;

    // Evaluate the schema in the secure compartment
    const schema = compartment.evaluate(wrappedCode);

    // Validate the response data against the schema
    const result = schema.safeParse(responseData);

    if (result.success) {
      return {
        isValid: true,
        errors: [],
      };
    } else {
      // Format Zod errors
      const formattedErrors = result.error.errors.map((err: z.ZodIssue) => ({
        path: err.path,
        message: err.message,
      }));

      return {
        isValid: false,
        errors: formattedErrors,
      };
    }
  } catch (error) {
    return {
      isValid: false,
      errors: [
        {
          path: [],
          message: `Schema evaluation error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
};
