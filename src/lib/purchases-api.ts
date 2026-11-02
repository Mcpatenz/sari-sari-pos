import { apiRequest, jsonBody } from "@/lib/api-client";

export type ApiPurchaseItem = {
  id: string;
  productId: string | null;
  productName: string;
  quantityBase: number;
  unitCostCents: number;
  product: { kind: "PIECE" | "WEIGHT" | "VOLUME" } | null;
};

export type ApiPurchase = {
  id: string;
  supplierId: string | null;
  supplier: { id: string; name: string } | null;
  totalCents: number;
  note: string | null;
  createdAt: string;
  items: ApiPurchaseItem[];
};

export async function listPurchases(): Promise<ApiPurchase[]> {
  const data = await apiRequest<{ purchases: ApiPurchase[] }>("/api/purchases");
  return data.purchases;
}

export async function createPurchase(input: {
  supplierId?: string | null;
  note?: string;
  items: { productId: string; quantityBase: number; lineTotalCents: number }[];
}): Promise<ApiPurchase> {
  const data = await apiRequest<{ purchase: ApiPurchase }>("/api/purchases", {
    method: "POST",
    ...jsonBody(input),
  });
  return data.purchase;
}
