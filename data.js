window.SEED_GENRES = [
  { id: 'minimal', name: 'ミニマル' },
  { id: 'street', name: 'ストリート' },
  { id: 'luxury', name: 'ラグジュアリー' },
  { id: 'vintage', name: 'ヴィンテージ' },
  { id: 'workwear', name: 'ワークウェア' },
  { id: 'avant', name: 'アヴァンギャルド' },
];

window.SEED_TAGS = ['アウター','トップス','ボトムス','シューズ','バッグ','アクセ','ニット','デニム'];

window.SEED_BRANDS = [
  { id:'b1', name:'Atelier Nord', initial:'A', swatch:{bg:'#1F1E1B',fg:'#8A8780',style:'mono'}, genres:['minimal','luxury'], price:4, tags:['アウター','シューズ'], note:'セールは年2回（1月・7月）。独自パターンのブーツが定番。', description:'北欧ミニマリズムを基調にした2014年設立のブランド。建築的なシルエットと未晒しの素材使いが特徴。', url:'https://example.com/atelier-nord', addedAt:'2026-02-14' },
  { id:'b2', name:'Halfway House', initial:'H', swatch:{bg:'#3A3836',fg:'#C8C5BF',style:'bold'}, genres:['street'], price:3, tags:['トップス','バッグ'], note:'木曜11時にドロップ。すぐ完売するのでリマインダー必須。', description:'スケートカルチャーとグラフィックデザインが交差するNYベースのストリートブランド。', url:'https://example.com/halfway', addedAt:'2026-02-01' },
  { id:'b3', name:'Kōbo Studio', initial:'K', swatch:{bg:'#E8E6E1',fg:'#8A8882',style:'paper'}, genres:['minimal','workwear'], price:2, tags:['トップス','ボトムス','ニット'], note:'素材の経年変化が魅力。Lサイズが日本人のMに相当。', description:'京都の小さな工房から始まった機能服レーベル。ヴィンテージの型紙を現代素材で再構築。', url:'https://example.com/kobo', addedAt:'2026-01-22' },
  { id:'b4', name:'Void Works', initial:'V', swatch:{bg:'#141413',fg:'#3A3936',style:'mono'}, genres:['avant','luxury'], price:4, tags:['アウター','シューズ','アクセ'], note:'表参道店の店員さんが詳しい。シーズン末にアーカイブセール。', description:'コンセプチュアルな解体と再構築を軸に据えた東京のアヴァンギャルドブランド。', url:'https://example.com/void', addedAt:'2026-01-10' },
  { id:'b5', name:'Sable & Stone', initial:'S', swatch:{bg:'#B8B5AE',fg:'#6A6864',style:'paper'}, genres:['luxury','minimal'], price:4, tags:['バッグ','アクセ'], note:'レザー製品は別注可。納期は約3ヶ月。', description:'イタリアのタンナーと組むレザーグッズ専業メゾン。定番の鞄は一生もの。', url:'https://example.com/sable', addedAt:'2025-12-30' },
  { id:'b6', name:'Paper Rain', initial:'P', swatch:{bg:'#F0EEE9',fg:'#A8A49C',style:'paper'}, genres:['minimal'], price:2, tags:['トップス','ボトムス'], note:'淡色の洗いざらしシリーズが特に好み。', description:'和紙と綿の混紡糸を独自開発。柔らかな色味のベーシックウェアを展開。', url:'https://example.com/paperrain', addedAt:'2025-12-18' },
  { id:'b7', name:'Iron Parade', initial:'I', swatch:{bg:'#2A2A28',fg:'#8A8882',style:'bold'}, genres:['workwear','vintage'], price:3, tags:['デニム','アウター'], note:'セルビッジデニムの洗い込み具合で経年を楽しむ。', description:'アメリカ30年代のワークウェアを下敷きにしたデニム主体のブランド。', url:'https://example.com/iron', addedAt:'2025-11-28' },
  { id:'b8', name:'Moss Chapel', initial:'M', swatch:{bg:'#2E2D2B',fg:'#9C9A94',style:'mono'}, genres:['avant'], price:3, tags:['ニット','アクセ'], note:'ニットウェアの色展開が毎シーズン秀逸。', description:'手編みニットとシルバーアクセを軸にした小さなベルリンのレーベル。', url:'https://example.com/moss', addedAt:'2025-11-05' },
];

window.SEED_PRODUCTS = [
  { id:'p1',  brandId:'b1', name:'Architectural Wool Coat',  price:248000, tags:['アウター'], status:'wishlist',    bookmarked:true,  swatch:{bg:'#2A2A28',fg:'#8A8882'}, actedAt:'2026-02-20' },
  { id:'p2',  brandId:'b1', name:'Paneled Leather Boots',    price:118000, tags:['シューズ'], status:'purchased',   bookmarked:true,  swatch:{bg:'#1F1E1B',fg:'#8A8882'}, actedAt:'2025-12-08' },
  { id:'p3',  brandId:'b1', name:'Raw-Edge Cardigan',        price:64000,  tags:['ニット'],   status:'considering', bookmarked:false, swatch:{bg:'#E6E4DE',fg:'#A8A49C'}, actedAt:'2025-11-14' },
  { id:'p4',  brandId:'b1', name:'Technical Shell Parka',    price:138000, tags:['アウター'], status:'wishlist',    bookmarked:false, swatch:{bg:'#1F1E1B',fg:'#4A4845'}, actedAt:'2026-02-05' },
  { id:'p5',  brandId:'b2', name:'Box Logo Hoodie',          price:28000,  tags:['トップス'], status:'purchased',   bookmarked:true,  swatch:{bg:'#3A3836',fg:'#F5F3EE'}, actedAt:'2026-01-28' },
  { id:'p6',  brandId:'b2', name:'Cordura Tote',             price:18000,  tags:['バッグ'],   status:'considering', bookmarked:false, swatch:{bg:'#2E2D2B',fg:'#C8C5BF'}, actedAt:'2025-11-30' },
  { id:'p7',  brandId:'b2', name:'Graphic Tee — Series 3',  price:9800,   tags:['トップス'], status:'wishlist',    bookmarked:true,  swatch:{bg:'#3A3836',fg:'#C8C5BF'}, actedAt:'2026-02-12' },
  { id:'p8',  brandId:'b3', name:'Washed Linen Shirt',       price:32000,  tags:['トップス'], status:'purchased',   bookmarked:true,  swatch:{bg:'#E8E6E1',fg:'#8a7a62'}, actedAt:'2025-10-22' },
  { id:'p9',  brandId:'b3', name:'Wide-Leg Trousers',        price:38000,  tags:['ボトムス'], status:'wishlist',    bookmarked:false, swatch:{bg:'#C4C1BA',fg:'#8A8882'}, actedAt:'2026-01-18' },
  { id:'p10', brandId:'b3', name:'Paper-Cotton Knit',        price:28000,  tags:['ニット'],   status:'considering', bookmarked:true,  swatch:{bg:'#F0EEE9',fg:'#A8A49C'}, actedAt:'2025-12-28' },
  { id:'p11', brandId:'b4', name:'Deconstructed Blazer',     price:198000, tags:['アウター'], status:'wishlist',    bookmarked:true,  swatch:{bg:'#141413',fg:'#333'},     actedAt:'2025-09-14' },
  { id:'p12', brandId:'b4', name:'Split-Sole Derby',         price:88000,  tags:['シューズ'], status:'considering', bookmarked:false, swatch:{bg:'#1F1E1B',fg:'#6A6864'}, actedAt:'2026-02-01' },
  { id:'p13', brandId:'b4', name:'Silver Pendant No.4',      price:42000,  tags:['アクセ'],   status:'purchased',   bookmarked:false, swatch:{bg:'#2A2A28',fg:'#B0ADA6'}, actedAt:'2025-08-05' },
  { id:'p14', brandId:'b5', name:'Folded Leather Bag',       price:178000, tags:['バッグ'],   status:'wishlist',    bookmarked:true,  swatch:{bg:'#B8B5AE',fg:'#5a4a38'}, actedAt:'2026-02-18' },
  { id:'p15', brandId:'b5', name:'Card Sleeve Wallet',       price:48000,  tags:['アクセ'],   status:'purchased',   bookmarked:false, swatch:{bg:'#C6C3BC',fg:'#7A7874'}, actedAt:'2025-07-12' },
  { id:'p16', brandId:'b6', name:'Garment-Dyed Tee',         price:12000,  tags:['トップス'], status:'purchased',   bookmarked:false, swatch:{bg:'#F0EEE9',fg:'#B0ADA6'}, actedAt:'2025-11-08' },
  { id:'p17', brandId:'b6', name:'Easy Pant — Natural',      price:24000,  tags:['ボトムス'], status:'considering', bookmarked:true,  swatch:{bg:'#DED9D0',fg:'#A8A49C'}, actedAt:'2025-12-22' },
  { id:'p18', brandId:'b7', name:'Selvedge 5-Pocket',        price:36000,  tags:['デニム'],   status:'wishlist',    bookmarked:true,  swatch:{bg:'#2A2A28',fg:'#8A8882'}, actedAt:'2026-01-24' },
  { id:'p19', brandId:'b7', name:'Chore Jacket',             price:42000,  tags:['アウター'], status:'considering', bookmarked:false, swatch:{bg:'#2E2D2B',fg:'#9C9A94'}, actedAt:'2025-10-18' },
  { id:'p20', brandId:'b8', name:'Hand-Knit Cardigan',       price:68000,  tags:['ニット'],   status:'wishlist',    bookmarked:true,  swatch:{bg:'#2E2D2B',fg:'#9C9A94'}, actedAt:'2025-12-02' },
  { id:'p21', brandId:'b8', name:'Cast Silver Ring',         price:32000,  tags:['アクセ'],   status:'purchased',   bookmarked:false, swatch:{bg:'#3A3836',fg:'#ACA9A2'}, actedAt:'2025-06-28' },
];
