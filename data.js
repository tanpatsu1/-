window.SEED_GENRES = [
  { id: 'minimal',  name: 'ミニマル' },
  { id: 'street',   name: 'ストリート' },
  { id: 'luxury',   name: 'ラグジュアリー' },
  { id: 'vintage',  name: 'ヴィンテージ' },
  { id: 'workwear', name: 'ワークウェア' },
  { id: 'avant',    name: 'アヴァンギャルド' },
];

window.SEED_TAGS = ['アウター','トップス','ボトムス','シューズ','バッグ','アクセ','ニット','デニム'];

window.SEED_BRANDS = [
  {
    id: 'b1', name: 'Atelier Nord', initial: 'A',
    swatch: { bg: '#1F1E1B', fg: '#8A8780', style: 'mono' },
    genres: ['minimal', 'luxury'], price: 4,
    tags: ['アウター', 'シューズ'],
    note: 'セールは年2回（1月・7月）。独自パターンのブーツが定番。',
    description: '北欧ミニマリズムを基調にした2014年設立のブランド。建築的なシルエットと未晒しの素材使いが特徴。',
    url: 'https://example.com', addedAt: '2026-02-14',
  },
  {
    id: 'b2', name: 'Kōbo Studio', initial: 'K',
    swatch: { bg: '#E8E6E1', fg: '#8A8882', style: 'paper' },
    genres: ['minimal', 'workwear'], price: 2,
    tags: ['トップス', 'ボトムス', 'ニット'],
    note: 'Lサイズが日本人のMに相当。素材の経年変化が魅力。',
    description: '京都の小さな工房から始まった機能服レーベル。ヴィンテージの型紙を現代素材で再構築。',
    url: 'https://example.com', addedAt: '2026-01-22',
  },
  {
    id: 'b3', name: 'Paper Rain', initial: 'P',
    swatch: { bg: '#F0EEE9', fg: '#A8A49C', style: 'paper' },
    genres: ['minimal'], price: 2,
    tags: ['トップス', 'ボトムス'],
    note: '淡色の洗いざらしシリーズが特に好み。',
    description: '和紙と綿の混紡糸を独自開発。柔らかな色味のベーシックウェアを展開。',
    url: 'https://example.com', addedAt: '2025-12-18',
  },
];

window.SEED_PRODUCTS = [
  { id: 'p1', brandId: 'b1', name: 'Wool Coat',      price: 248000, tags: ['アウター'], status: 'wishlist',    bookmarked: true,  swatch: { bg: '#2A2A28', fg: '#8A8882' }, actedAt: '2026-02-20' },
  { id: 'p2', brandId: 'b1', name: 'Leather Boots',  price: 118000, tags: ['シューズ'], status: 'purchased',   bookmarked: true,  swatch: { bg: '#1F1E1B', fg: '#8A8882' }, actedAt: '2025-12-08' },
  { id: 'p3', brandId: 'b2', name: 'Linen Shirt',    price:  32000, tags: ['トップス'], status: 'purchased',   bookmarked: true,  swatch: { bg: '#E8E6E1', fg: '#8a7a62' }, actedAt: '2025-10-22' },
  { id: 'p4', brandId: 'b2', name: 'Wide-Leg Trousers', price: 38000, tags: ['ボトムス'], status: 'considering', bookmarked: false, swatch: { bg: '#C4C1BA', fg: '#8A8882' }, actedAt: '2026-01-18' },
  { id: 'p5', brandId: 'b3', name: 'Garment-Dyed Tee', price: 12000, tags: ['トップス'], status: 'purchased',   bookmarked: false, swatch: { bg: '#F0EEE9', fg: '#B0ADA6' }, actedAt: '2025-11-08' },
  { id: 'p6', brandId: 'b3', name: 'Easy Pant',      price:  24000, tags: ['ボトムス'], status: 'considering', bookmarked: true,  swatch: { bg: '#DED9D0', fg: '#A8A49C' }, actedAt: '2025-12-22' },
];
