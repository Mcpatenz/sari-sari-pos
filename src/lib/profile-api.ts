import { apiRequest, jsonBody } from "@/lib/api-client";

export type ApiProfile = {
  id: string;
  name: string;
  email: string | null;
  role: "OWNER" | "CASHIER";
  active: boolean;
  employeeId: string | null;
  address: string | null;
  birthdate: string | null;
  gender: string | null;
  civilStatus: string | null;
  contactNumber: string | null;
  dateHired: string | null;
  photoUrl: string | null;
  lastLoginAt: string | null;
  createdAt: string;
};

export type ProfileInput = {
  name?: string;
  email?: string;
  address?: string | null;
  birthdate?: string | null;
  gender?: string | null;
  civilStatus?: string | null;
  contactNumber?: string | null;
  dateHired?: string | null;
  photoUrl?: string | null;
  password?: string;
};

export async function fetchProfile(): Promise<ApiProfile> {
  const data = await apiRequest<{ profile: ApiProfile }>("/api/profile");
  return data.profile;
}

export async function updateProfile(input: ProfileInput): Promise<ApiProfile> {
  const data = await apiRequest<{ profile: ApiProfile }>("/api/profile", {
    method: "PUT",
    ...jsonBody(input),
  });
  return data.profile;
}
