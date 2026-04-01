import { RoomMemberRole, type RoomMember } from "../../generated/prisma/client";
import { AppError } from "../../helpers/app-error";

const roleWeight: Record<RoomMemberRole, number> = {
  OWNER: 3,
  ADMIN: 2,
  MEMBER: 1
};

export const roomAuthorizationService = {
  requireMembership(member: RoomMember | null) {
    if (!member) {
      throw new AppError(403, "ROOM_ACCESS_DENIED", "You are not a member of this room");
    }
    return member;
  },
  requireRole(member: RoomMember | null, minimumRole: RoomMemberRole) {
    const resolvedMember = roomAuthorizationService.requireMembership(member);
    if (roleWeight[resolvedMember.role] < roleWeight[minimumRole]) {
      throw new AppError(403, "ROOM_ROLE_FORBIDDEN", `This action requires ${minimumRole.toLowerCase()} privileges`);
    }
    return resolvedMember;
  }
};
