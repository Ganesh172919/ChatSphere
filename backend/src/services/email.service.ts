import { logger } from "../helpers/logger";

export const sendPasswordResetEmail = async (
    email: string,
    resetUrl: string,
    requestId?: string
): Promise<void> => {
    // This is intentionally transport-agnostic for local/dev usage.
    logger.info("Password reset email prepared", {
        requestId,
        email,
        resetUrl,
    });
};
