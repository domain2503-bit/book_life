export type Category =
  | "경제경영"
  | "자기계발"
  | "인문"
  | "유아"
  | "건강"
  | "산업트렌드";

export type ActionStatus = "pending" | "done";

export const CATEGORIES: Category[] = [
  "경제경영",
  "자기계발",
  "인문",
  "유아",
  "건강",
  "산업트렌드",
];

export interface Book {
  id?: string;
  title: string;
  author: string;
  publisher?: string;
  thumbnail?: string;
  description?: string;
  category?: Category;
  isbn?: string;
  source?: "curated" | "naver";
}

export interface ActionItem {
  id: string;
  book_id: string;
  book_title?: string;
  point: string;
  action: string;
  example: string;
  page: string;
  category: Category;
}

export interface UserLog {
  id: string;
  action_item_id: string;
  status: ActionStatus;
  note?: string;
  created_at: string;
}

export interface ReviewSource {
  title?: string;
  url: string;
}

export interface GeneratedData {
  bookTitle: string;
  bookThumbnail: string;
  bookCategory: string;
  bookSummary: string;
  reviewSources: ReviewSource[];
  actionItems: ActionItem[];
}
