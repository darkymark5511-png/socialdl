declare module "@coflyn/scrapr" {
  type ScraprResult = {
    status?: boolean;
    success?: boolean;
    message?: string;
    result?: Record<string, unknown>;
    data?: Record<string, unknown>;
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
    indown?: ScraprFn;
    snapinsta?: ScraprFn;
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
    ytmp3?: ScraprFn;
  };
  export const facebook: {
    snapsave?: ScraprFn;
    fdown?: ScraprFn;
  };
  export const pinterest: {
    direct?: ScraprFn;
    pindown?: ScraprFn;
  };
}
