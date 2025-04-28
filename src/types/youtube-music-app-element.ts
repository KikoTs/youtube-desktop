export interface YouTubeAppElement extends HTMLElement {
  navigate(page: string): void;
  networkManager: {
    fetch: (url: string, data: unknown) => Promise<unknown>;
  };
}
