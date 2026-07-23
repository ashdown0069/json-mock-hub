export const authKeys = {
  all: ["auth"] as const,
  user: () => ["currentUser"] as const,
};
