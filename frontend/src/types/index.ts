export type Category = "투자" | "육아" | "자기계발" | "업무" | "건강";
export type ActionStatus = "pending" | "done";
export type ReviewSource = { title: string; url: string };

export interface Book {
  id?: string;
  title: string;
  author: string;
  publisher?: string;
  thumbnail?: string;
  description?: string;
  category?: Category;
  isbn?: string;
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

export const CATEGORIES: Category[] = ["투자", "육아", "자기계발", "업무", "건강"];

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  MyLife: undefined;
  ActionDetail: {
    item: ActionItem | null;
    log?: UserLog | null;
    allItems?: ActionItem[];
    bookTitle?: string;
    bookThumbnail?: string;
    bookCategory?: string;
    bookSummary?: string;
    reviewSources?: ReviewSource[];
    newGeneration?: boolean;
    logMode?: boolean;
  };
};
