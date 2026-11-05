declare module "@coflyn/scrapr" {
  type ScraprResult = {
    status: boolean;
    message?: string;
    result?: {
      title?: string;
      author?: string;
      thumbnail?: string;
      duration?: number;
      downloads?: Array<{
        url: string;
        quality?: string;
        type?: string;
        size?: number;
      }>;
      images?: Array<{ url: string; width?: number; height?: number }>;
      videos?: Array<{ url: string; quality?: string; duration?: number }>;
    };
  };

  type ScraprFn = (url: string) => Promise<ScraprResult>;

  export const tiktok: {
    snaptik?: ScraprFn;
    tiktokio?: ScraprFn;
    ssstik?: ScraprFn;
    savetik?: ScraprFn;
    tikdownloader?: ScraprFn;
  };
  export const instagram: {
    snapsave?: ScraprFn;
    direct?: ScraprFn;
  };
  export const twitter: {
    direct?: ScraprFn;
    fx?: ScraprFn;
  };
  export const douyin: {
    direct?: ScraprFn;
  };
  export const rednote: {
    direct?: ScraprFn;
    snapsave?: ScraprFn;
  };
  export const youtube: {
    direct?: ScraprFn;
    y2mate?: ScraprFn;
  };
  export const facebook: {
    snapsave?: ScraprFn;
    fdown?: ScraprFn;
  };
  export const pinterest: {
    direct?: ScraprFn;
  };
}
