// Test schema with intentional syntax errors (as comments)

// Example 1: Missing closing curly bracket
// const schema1 = z.object({
//   name:z.string()
// Missing closing parenthesis and curly bracket

// Example 2: Missing z prefix
// const schema2 = z.object({
//   age: number()
// })

// Example 3: Missing closing square bracket
// const schema3 = z.array([
//   z.string()
// Missing closing square bracket

// These examples should still be detected as errors by our validation logic
