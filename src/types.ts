export type SearchResult = {
  title: string;
  url: string;
  snippet?: string;
};

export type SearchWebSuccess = {
  success: true;
  query: string;
  results: SearchResult[];
};

export type ToolFailure = {
  success: false;
  error: string;
};

export type SearchWebResult = SearchWebSuccess | ToolFailure;
