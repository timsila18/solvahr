import type { Request } from "express";
import { Prisma } from "@prisma/client";
import { isDatabaseConfigured, prisma } from "./prisma.js";

type AuditInput = {
  request: Request;
  action: string;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
};

function jsonValue(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value));
}

export async function writeAuditLog({ request, action, entityType, entityId, before, after }: AuditInput) {
  if (!isDatabaseConfigured()) {
    return;
  }

  try {
    await prisma.auditLog.create({
      data: {
        tenantId: request.user.tenantId,
        actorUserId: request.user.id === "demo-user" ? null : request.user.id,
        action,
        entityType,
        entityId: entityId ?? null,
        before: jsonValue(before) ?? Prisma.JsonNull,
        after: jsonValue(after) ?? Prisma.JsonNull,
        ipAddress: request.ip ?? null,
        userAgent: request.header("user-agent") ?? null
      }
    });
  } catch (error) {
    console.warn("Audit log write failed", error);
  }
}
