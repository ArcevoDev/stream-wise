import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

/**
 * Validates req.body against the given Zod schema. On success, replaces
 * req.body with the parsed (and coerced/trimmed/defaulted) value so
 * downstream controllers can trust its shape. On failure, responds 400
 * with a flattened, readable error list.
 */
export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: "Validation failed",
        details: result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

/**
 * Validates req.query against the given Zod schema.
 * On success replaces req.query with the parsed/coerced value.
 * Applies to GET routes where query params need validation
 * (e.g. GET /jamb/catalog?stream=SCIENCE&faculty=Medicine).
 */
export function validateQuery<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({
        error: "Invalid query parameters",
        details: result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
      return;
    }
    // Cast is safe. Zod has already validated the shape
    req.query = result.data as qs.ParsedQs;
    next();
  };
}