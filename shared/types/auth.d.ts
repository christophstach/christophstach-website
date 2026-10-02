declare module "#auth-utils" {
  interface User {
    githubId: number;
    login: string;
    avatarUrl: string;
  }
}

// The export makes this file a module, so the block above augments
// #auth-utils instead of replacing it.
// oxlint-disable-next-line unicorn/require-module-specifiers
export {};
