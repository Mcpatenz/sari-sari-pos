import { apiRequest, jsonBody } from "@/lib/api-client";

export type ApiUser = {
  id: string;
  name: string;
  email: string | null;
  role: "OWNER" | "CASHIER";
  active: boolean;
  employeeId: string | null;
  contactNumber: string | null;
  dateHired: string | null;
  photoUrl: string | null;
  lastLoginAt: string | null;
  createdAt: string;
};

export async function listUsers(): Promise<ApiUser[]> {
  const data = await apiRequest<{ users: ApiUser[] }>("/api/users");
  return data.users;
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
  role: "OWNER" | "CASHIER";
  contactNumber?: string | null;
  dateHired?: string | null;
  photoUrl?: string | null;
}): Promise<ApiUser> {
  const data = await apiRequest<{ user: ApiUser }>("/api/users", {
    method: "POST",
    ...jsonBody(input),
  });
  return data.user;
}

export async function updateUser(
  id: string,
  input: {
    name?: string;
    role?: "OWNER" | "CASHIER";
    active?: boolean;
    password?: string;
    contactNumber?: string | null;
    dateHired?: string | null;
    photoUrl?: string | null;
  },
): Promise<ApiUser> {
  const data = await apiRequest<{ user: ApiUser }>(
    `/api/users?id=${encodeURIComponent(id)}`,
    { method: "PUT", ...jsonBody(input) },
  );
  return data.user;
}
