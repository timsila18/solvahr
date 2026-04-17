import type { NextFunction, Request, Response } from "express";
import { permissions, roleHasPermission, type Permission } from "@solva/shared";
import { sendError } from "./http.js";

export type ApiUser = {
  id: string;
  tenantId: string;
  email: string;
  roles: string[];
};

declare global {
  namespace Express {
    interface Request {
      user: ApiUser;
    }
  }
}

const permissionSet = new Set<string>(permissions);

function parseRoles(rawRoles: string | string[] | undefined): string[] {
  if (!rawRoles) {
    return ["company_admin"];
  }

  const value = Array.isArray(rawRoles) ? rawRoles.join(",") : rawRoles;
  return value
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);
}

export function attachUserContext(request: Request, _response: Response, next: NextFunction) {
  request.user = {
    id: String(request.header("x-user-id") ?? "demo-user"),
    tenantId: String(request.header("x-tenant-id") ?? "tenant-solva-demo"),
    email: String(request.header("x-user-email") ?? "admin@solvahr.demo"),
    roles: parseRoles(request.header("x-user-roles") ?? undefined)
  };

  next();
}

export function requirePermission(permission: Permission) {
  if (!permissionSet.has(permission)) {
    throw new Error(`Unknown permission: ${permission}`);
  }

  return (request: Request, response: Response, next: NextFunction) => {
    const allowed = request.user.roles.some((role) => roleHasPermission(role, permission));

    if (!allowed) {
      sendError(response, 403, "Forbidden", {
        permission,
        roles: request.user.roles
      });
      return;
    }

    next();
  };
}

export function userHasPermission(user: ApiUser, permission: Permission) {
  return user.roles.some((role) => roleHasPermission(role, permission));
}
