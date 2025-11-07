import { encrypt, decrypt } from "../../lib/crypto";
import { prisma } from "../../lib/prisma";

interface CreateSessionInput {
  displayName: string;
  email?: string;
  cursorApiKey: string;
}

export const createSession = async ({ displayName, email, cursorApiKey }: CreateSessionInput) => {
  const encryptedKey = encrypt(cursorApiKey);

  const user = await prisma.user.create({
    data: {
      displayName,
      email,
      credential: {
        create: { encryptedApiKey: encryptedKey },
      },
    },
  });

  return {
    userId: user.id,
    displayName: user.displayName,
    email: user.email,
  };
};

export const getDecryptedCursorKey = async (userId: string) => {
  const credential = await prisma.cursorCredential.findUnique({
    where: { userId },
  });

  if (!credential) {
    return null;
  }

  return decrypt(credential.encryptedApiKey);
};

export const clearCursorCredential = async (userId: string) => {
  await prisma.cursorCredential.deleteMany({
    where: { userId },
  });
};
