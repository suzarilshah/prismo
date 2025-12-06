"use client";

import { StackClientApp } from "@stackframe/stack";

export const stackClientApp = new StackClientApp({
  tokenStore: "nextjs-cookie",
  urls: {
    home: "/dashboard",
    signIn: "/sign-in",
    signUp: "/sign-up",
    afterSignIn: "/dashboard",
    afterSignUp: "/onboarding",
    afterSignOut: "/",
  },
});
