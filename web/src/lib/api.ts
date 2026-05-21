import { getDeviceId } from "./deviceId";
import type { ActionItem, UserLog, Book, ReviewSource } from "./types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  signal?: AbortSignal
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Device-ID": getDeviceId(),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err: any = new Error(data.detail || res.statusText);
    err.status = res.status;
    err.detail = data.detail;
    throw err;
  }
  return res.json() as Promise<T>;
}

// Books
export const searchBooks = (title: string) =>
  request<{ books: Book[] }>("POST", "/books/search", { title });

export const recommendBooks = (keyword: string) =>
  request<{ books: Book[] }>("POST", "/books/recommend", { keyword });

// Actions
export const generateActions = (
  book_title: string,
  author: string,
  book_category?: string,
  signal?: AbortSignal
) =>
  request<{
    book_id: string;
    book_title: string;
    book_category: string;
    book_summary: string;
    review_sources: ReviewSource[];
    action_items: ActionItem[];
  }>(
    "POST",
    "/actions/generate",
    { book_title, author, book_category, reviews: [] },
    signal
  );

export const getActionItems = (category?: string) =>
  request<{ action_items: ActionItem[] }>(
    "GET",
    `/actions/${category ? `?category=${encodeURIComponent(category)}` : ""}`
  );

// Logs
export const upsertLog = (
  action_item_id: string,
  status: "pending" | "done",
  note?: string
) =>
  request<UserLog>("POST", "/logs/", {
    action_item_id,
    status,
    note,
  });

export const getLogs = (action_item_id?: string) =>
  request<{ logs: UserLog[] }>(
    "GET",
    `/logs/${action_item_id ? `?action_item_id=${action_item_id}` : ""}`
  );

export const deleteLog = (action_item_id: string) =>
  request<void>("DELETE", `/logs/${action_item_id}`);
