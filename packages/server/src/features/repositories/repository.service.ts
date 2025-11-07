import { prisma } from "../../lib/prisma";

interface UpsertRepositoryInput {
  userId: string;
  provider: string;
  name: string;
  fullName: string;
  defaultBranch?: string;
  cloneUrl?: string;
  alias?: string;
}

export const upsertRepositoryForUser = async ({
  userId,
  provider,
  name,
  fullName,
  defaultBranch,
  cloneUrl,
  alias,
}: UpsertRepositoryInput) => {
  const repository = await prisma.repository.upsert({
    where: { fullName },
    create: {
      provider,
      name,
      fullName,
      defaultBranch,
      cloneUrl,
      users: {
        create: {
          userId,
          alias,
        },
      },
    },
    update: {
      name,
      defaultBranch,
      cloneUrl,
    },
  });

  await prisma.userRepository.upsert({
    where: {
      userId_repositoryId: {
        userId,
        repositoryId: repository.id,
      },
    },
    create: {
      userId,
      repositoryId: repository.id,
      alias,
    },
    update: {
      alias,
    },
  });

  return repository;
};

export const listRepositoriesForUser = async (userId: string) => {
  const repositories = await prisma.userRepository.findMany({
    where: { userId },
    include: {
      repository: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return repositories.map(({ repository, alias, createdAt }) => ({
    id: repository.id,
    provider: repository.provider,
    name: repository.name,
    fullName: repository.fullName,
    defaultBranch: repository.defaultBranch,
    cloneUrl: repository.cloneUrl,
    alias,
    linkedAt: createdAt,
  }));
};
