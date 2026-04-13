import type { NextFunction, Request, Response } from "express";

type AsyncRoute = (request: Request, response: Response, next: NextFunction) => Promise<unknown>;

export function asyncHandler(route: AsyncRoute) {
  return (request: Request, response: Response, next: NextFunction) => {
    route(request, response, next).catch(next);
  };
}

export function sendError(response: Response, status: number, message: string, details?: unknown) {
  response.status(status).json({
    error: {
      message,
      details
    }
  });
}
