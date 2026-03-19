import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      roleCode?: string;
      companyId?: string | null;
    };
  }

  interface User {
    roleCode?: string;
    companyId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    roleCode?: string;
    companyId?: string | null;
  }
}
