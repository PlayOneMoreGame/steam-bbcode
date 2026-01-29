// Steam context types and tag support configuration

export type SteamContext = 'announcements' | 'guides' | 'forums' | 'reviews';

export type TagSupport = boolean | 'limited';

export interface TagSupportMatrix {
  h1: TagSupport;
  h2: TagSupport;
  h3: TagSupport;
  list: TagSupport;
  olist: TagSupport;
  table: TagSupport;
  img: TagSupport;
  video: TagSupport;
  spoiler: TagSupport;
  code: TagSupport;
  quote: TagSupport;
  b: TagSupport;
  i: TagSupport;
  u: TagSupport;
  strike: TagSupport;
  url: TagSupport;
  hr: TagSupport;
}

export const TAG_SUPPORT: Record<SteamContext, TagSupportMatrix> = {
  announcements: {
    h1: true, h2: true, h3: true,
    list: true, olist: true,
    table: true, img: true, video: true,
    spoiler: true, code: true, quote: true,
    b: true, i: true, u: true, strike: true,
    url: true, hr: true,
  },
  guides: {
    h1: true, h2: true, h3: true,
    list: true, olist: true,
    table: true, img: 'limited', video: true,
    spoiler: true, code: true, quote: true,
    b: true, i: true, u: true, strike: true,
    url: true, hr: true,
  },
  forums: {
    h1: true, h2: true, h3: true,
    list: true, olist: true,
    table: true, img: true, video: false,
    spoiler: true, code: true, quote: true,
    b: true, i: true, u: true, strike: true,
    url: true, hr: true,
  },
  reviews: {
    h1: true, h2: true, h3: true,
    list: true, olist: true,
    table: false, img: false, video: false,
    spoiler: true, code: true, quote: true,
    b: true, i: true, u: true, strike: true,
    url: true, hr: true,
  },
};

export const CHAR_LIMITS: Record<SteamContext | 'discord', number> = {
  announcements: 8000,
  guides: 8000,
  forums: 4000,
  reviews: 8000,
  discord: 2000,
};

export const CONTEXT_LABELS: Record<SteamContext, string> = {
  announcements: 'Announcements',
  guides: 'Guides',
  forums: 'Forums',
  reviews: 'Reviews',
};
