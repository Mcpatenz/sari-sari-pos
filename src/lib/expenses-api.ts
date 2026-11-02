import { apiRequest, jsonBody } from "@/lib/api-client";

export type ApiExpense = {
  id: string;
  category: string;
  description: string;
  amountCents: number;
  receiptUrl?: string | null;
  spentAt: string;
  createdAt: string;
};

export async function listExpenses(): Promise<ApiExpense[]> {
  const data = await apiRequest<{ expenses: ApiExpense[] }>("/api/expenses");
  return data.expenses;
}

export async function createExpense(input: {
  description: string;
  category: string;
  amountCents: number;
  spentAt?: string;
  receiptUrl?: string | null;
}): Promise<ApiExpense> {
  const data = await apiRequest<{ expense: ApiExpense }>("/api/expenses", {
    method: "POST",
    ...jsonBody(input),
  });
  return data.expense;
}

export async function deleteExpense(id: string): Promise<void> {
  await apiRequest(`/api/expenses?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
