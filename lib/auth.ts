import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "prismo-finance-secret-key-change-in-production"
);

const COOKIE_NAME = "prismo_session";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
}

export interface Session {
  user: SessionUser;
  expires: Date;
}

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// JWT token management
export async function createToken(payload: SessionUser): Promise<string> {
  const token = await new SignJWT({ user: payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
  
  return token;
}

export async function verifyToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const user = payload.user as SessionUser;
    
    return {
      user,
      expires: new Date(payload.exp! * 1000),
    };
  } catch {
    return null;
  }
}

// Session management
export async function createSession(user: SessionUser): Promise<void> {
  const token = await createToken(user);
  const cookieStore = await cookies();
  
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  
  if (!token) return null;
  
  return verifyToken(token);
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// User authentication
export async function signUp(email: string, password: string, name: string) {
  // Check if user already exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });
  
  if (existingUser) {
    throw new Error("User with this email already exists");
  }
  
  // Hash password
  const passwordHash = await hashPassword(password);
  
  // Create user
  const [newUser] = await db
    .insert(users)
    .values({
      email: email.toLowerCase(),
      name,
      passwordHash,
      emailVerified: true, // For now, skip email verification
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
    });
  
  // Create session
  await createSession({
    id: newUser.id,
    email: newUser.email,
    name: newUser.name,
  });
  
  return newUser;
}

export async function signIn(email: string, password: string) {
  // Find user
  const user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });
  
  if (!user) {
    throw new Error("Invalid email or password");
  }
  
  if (!user.passwordHash) {
    throw new Error("Please use the original sign-in method for this account");
  }
  
  // Verify password
  const isValid = await verifyPassword(password, user.passwordHash);
  
  if (!isValid) {
    throw new Error("Invalid email or password");
  }
  
  // Create session
  await createSession({
    id: user.id,
    email: user.email,
    name: user.name,
  });
  
  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}

export async function signOut() {
  await deleteSession();
}

// Get current user from database (fresh data)
export async function getCurrentUser() {
  const session = await getSession();
  
  if (!session) return null;
  
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });
  
  if (!user) return null;
  
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    currency: user.currency,
    occupation: user.occupation,
    salary: user.salary,
    twoFactorEnabled: user.twoFactorEnabled,
    createdAt: user.createdAt,
  };
}
