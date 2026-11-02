import { apiRequest, jsonBody } from "@/lib/api-client";

export type ApiCategory = {
  id: string;
  name: string;
  productCount: number;
  createdAt: string;
  updatedAt: string;
};

export async function listCategories(): Promise<ApiCategory[]> {
  const data = await apiRequest<{ categories: ApiCategory[] }>("/api/categories");
  return data.categories;
}

export async function createCategory(name: string): Promise<ApiCategory> {
  const data = await apiRequest<{ category: ApiCategory }>("/api/categories", {
    method: "POST",
    ...jsonBody({ name }),
  });
  return data.category;
}

export async function renameCategory(
  name: string,
  newName: string,
): Promise<{ category: ApiCategory | null; movedProducts: number }> {
  return apiRequest<{ category: ApiCategory | null; movedProducts: number }>(
    "/api/categories",
    { method: "PUT", ...jsonBody({ name, newName }) },
  );
}

export async function deleteCategory(
  name: string,
): Promise<{ movedProducts: number }> {
  return apiRequest<{ movedProducts: number }>("/api/categories", {
    method: "DELETE",
    ...jsonBody({ name }),
  });
}
