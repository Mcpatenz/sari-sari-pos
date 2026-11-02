import { apiRequest, jsonBody } from "@/lib/api-client";

export type ApiSupplier = {
  id: string;
  name: string;
  phone: string | null;
  note: string | null;
  active: boolean;
  createdAt: string;
};

export async function listSuppliers(): Promise<ApiSupplier[]> {
  const data = await apiRequest<{ suppliers: ApiSupplier[] }>("/api/suppliers");
  return data.suppliers;
}

export async function createSupplier(input: {
  name: string;
  phone?: string | null;
  note?: string | null;
}): Promise<ApiSupplier> {
  const data = await apiRequest<{ supplier: ApiSupplier }>("/api/suppliers", {
    method: "POST",
    ...jsonBody(input),
  });
  return data.supplier;
}

export async function updateSupplier(
  id: string,
  input: Partial<{ name: string; phone: string | null; note: string | null; active: boolean }>,
): Promise<ApiSupplier> {
  const data = await apiRequest<{ supplier: ApiSupplier }>(
    `/api/suppliers?id=${encodeURIComponent(id)}`,
    { method: "PUT", ...jsonBody(input) },
  );
  return data.supplier;
}
