import { apiRequest, jsonBody } from "@/lib/api-client";

export type ApiStore = {
  id: string;
  name: string;
  slug: string | null;
  address: string | null;
  phone: string | null;
  photoUrl: string | null;
  gcashQrDataUrl: string | null;
  businessOpenTime: string | null;
  businessCloseTime: string | null;
  status: "ACTIVE" | "SUSPENDED";
};

export async function fetchStore(): Promise<ApiStore> {
  const data = await apiRequest<{ store: ApiStore }>("/api/store");
  return data.store;
}

export async function saveStore(input: {
  name: string;
  address: string | null;
  phone: string | null;
  photoUrl?: string | null;
  gcashQrDataUrl?: string | null;
  businessOpenTime?: string | null;
  businessCloseTime?: string | null;
}): Promise<ApiStore> {
  const data = await apiRequest<{ store: ApiStore }>("/api/store", {
    method: "PUT",
    ...jsonBody(input),
  });
  return data.store;
}
