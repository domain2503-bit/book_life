import axios from "axios";
import { getDeviceId } from "../utils/deviceId";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8001";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(async (config) => {
  const deviceId = await getDeviceId();
  config.headers["X-Device-ID"] = deviceId;
  return config;
});

// Books
export const searchBooks = (title: string, author?: string) =>
  api.post("/books/search", { title, author });

export const recommendBooks = (keyword: string) =>
  api.post("/books/recommend", { keyword });

export const getSavedBooks = () => api.get("/books/");

// Actions
export const generateActions = (
  book_title: string,
  author: string,
  book_category?: string,
  reviews: string[] = [],
  signal?: AbortSignal
) => api.post("/actions/generate", { book_title, author, book_category, reviews }, { signal });

export const getActionItems = (category?: string) =>
  api.get("/actions/", { params: category ? { category } : {} });

export const getActionsByBook = (book_id: string) =>
  api.get(`/actions/${book_id}`);

// Logs
export const upsertLog = (
  action_item_id: string,
  status: "pending" | "done",
  note?: string
) => api.post("/logs/", { action_item_id, status, note });

export const getLogs = (action_item_id?: string) =>
  api.get("/logs/", { params: action_item_id ? { action_item_id } : {} });

export const deleteLog = (action_item_id: string) =>
  api.delete(`/logs/${action_item_id}`);
