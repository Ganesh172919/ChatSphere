import { ReportStatus, ReportTargetType } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../helpers/errors";
import { listPromptTemplates, upsertPromptTemplate } from "./promptCatalog.service";

export const getAdminStats = async () => {
    const [users, rooms, messages, conversations] = await Promise.all([
        prisma.user.count(),
        prisma.room.count(),
        prisma.message.count(),
        prisma.conversation.count(),
    ]);

    const recentUsers = await prisma.user.findMany({
        select: {
            id: true,
            username: true,
            email: true,
            createdAt: true,
        },
        orderBy: {
            createdAt: "desc",
        },
        take: 10,
    });

    return {
        totals: {
            users,
            rooms,
            messages,
            conversations,
        },
        recentUsers,
    };
};

export const listReports = async (filters: {
    status?: string;
    targetType?: string;
    page?: number;
    pageSize?: number;
}) => {
    const page = Math.max(1, Number(filters.page ?? 1));
    const pageSize = Math.min(Math.max(1, Number(filters.pageSize ?? 20)), 100);

    const where = {
        ...(filters.status && ReportStatus[filters.status as keyof typeof ReportStatus]
            ? {
                  status: ReportStatus[filters.status as keyof typeof ReportStatus],
              }
            : {}),
        ...(filters.targetType &&
        ReportTargetType[filters.targetType as keyof typeof ReportTargetType]
            ? {
                  targetType:
                      ReportTargetType[filters.targetType as keyof typeof ReportTargetType],
              }
            : {}),
    };

    const [total, rows] = await Promise.all([
        prisma.report.count({ where }),
        prisma.report.findMany({
            where,
            include: {
                reporter: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
                reviewedBy: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
    ]);

    return {
        total,
        page,
        pageSize,
        reports: rows,
    };
};

export const reviewReport = async (
    adminUserId: string,
    reportId: string,
    payload: {
        status: "REVIEWED" | "RESOLVED" | "REJECTED";
        resolutionNote?: string;
    }
) => {
    const report = await prisma.report.findUnique({
        where: {
            id: reportId,
        },
    });

    if (!report) {
        throw new AppError("Report not found", 404, "NOT_FOUND");
    }

    return prisma.report.update({
        where: {
            id: reportId,
        },
        data: {
            status: ReportStatus[payload.status],
            reviewedById: adminUserId,
            reviewedAt: new Date(),
            resolutionNote: payload.resolutionNote?.trim(),
        },
    });
};

export const listUsers = async (filters: {
    query?: string;
    page?: number;
    pageSize?: number;
}) => {
    const page = Math.max(1, Number(filters.page ?? 1));
    const pageSize = Math.min(Math.max(1, Number(filters.pageSize ?? 20)), 100);

    const query = filters.query?.trim();

    const where = query
        ? {
              OR: [
                  {
                      username: {
                          contains: query,
                          mode: "insensitive" as const,
                      },
                  },
                  {
                      email: {
                          contains: query,
                          mode: "insensitive" as const,
                      },
                  },
                  {
                      displayName: {
                          contains: query,
                          mode: "insensitive" as const,
                      },
                  },
              ],
          }
        : {};

    const [total, rows] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
            where,
            select: {
                id: true,
                username: true,
                email: true,
                displayName: true,
                authProvider: true,
                isAdmin: true,
                onlineStatus: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: "desc",
            },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
    ]);

    return {
        total,
        page,
        pageSize,
        users: rows,
    };
};

export const listAdminPromptTemplates = async () => {
    return listPromptTemplates();
};

export const upsertAdminPromptTemplate = async (payload: {
    key: string;
    version?: number;
    description?: string;
    content: string;
    isActive?: boolean;
}) => {
    return upsertPromptTemplate(payload);
};
