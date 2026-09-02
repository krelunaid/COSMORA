export type Product = {
  slug: string;
  name: string;
  price: number;
  buyPrice?: number;
  rentPrice?: number;
  rentDays?: number;
  deposit?: number;
  image: string;
  category: string;
  seller: string;
  rating: string;
  shipping: string;
  mode?: 'Rent' | 'Buy';
  condition: 'New' | 'Like New' | 'Used';
  country: string;
  size?: string;
  measurements?: string;
  brand?: string;
  estimatedDelivery: string;
  localPickup: boolean;
  verified: boolean;
  description: string;
};

export const products: Product[] = [
  { slug: 'raiden-shogun-cosplay', name: 'Raiden Shogun Cosplay Costume', price: 149, buyPrice:249, rentPrice:149, rentDays:3, deposit:100, image: '/hd-category-cosplay.png', category: 'Cosplay', seller: 'Stardust Atelier', rating: '4.9 (128)', shipping: 'Free shipping', mode: 'Rent', condition:'Like New', country:'Germany', size:'M (EU 38–40)', measurements:'Bust 88–92 cm · Waist 68–72 cm', brand:'Handmade / Fan-made', estimatedDelivery:'3–5 business days', localPickup:true, verified:true, description:'Complete handcrafted cosplay set with costume, accessories and styled wig. Worn once and professionally cleaned.' },
  { slug: 'one-piece-manga-box-set', name: 'One Piece Manga Box Set (Water 1–7)', price: 85, buyPrice:85, image: '/hd-category-manga.png', category: 'Comics', seller: 'MangaVault', rating: '4.8 (96)', shipping: 'Free shipping', mode: 'Buy', condition:'Like New', country:'France', brand:'Licensed edition', estimatedDelivery:'4–6 business days', localPickup:false, verified:true, description:'Complete seven-volume manga box set in excellent condition with original case.' },
  { slug: 'ninja-collectible-figure', name: 'Ninja Hero Collectible Figure', price: 64.9, buyPrice:64.9, image: '/hd-category-figures.png', category: 'Figures', seller: 'Collector_JTA', rating: '4.9 (74)', shipping: 'EU shipping €4.90', mode: 'Buy', condition:'New', country:'Italy', brand:'Licensed collectible', estimatedDelivery:'2–4 business days', localPickup:true, verified:true, description:'Display figure supplied in its original sealed packaging.' },
  { slug: 'tcg-binder-collection', name: 'Pokémon TCG Binder Collection', price: 39.99, buyPrice:39.99, image: '/hd-category-cards.png', category: 'Cards', seller: 'CardUniverse', rating: '4.8 (210)', shipping: 'Free shipping', mode: 'Buy', condition:'Used', country:'Spain', brand:'Mixed collection', estimatedDelivery:'4–7 business days', localPickup:false, verified:true, description:'Curated binder collection. Card conditions range from good to near mint; detailed list available in chat.' },
  { slug: 'pro-controller', name: 'Pro Wireless Gaming Controller', price: 59.9, buyPrice:59.9, image: '/hd-category-gaming.png', category: 'Gaming', seller: 'PixelForge', rating: '4.7 (54)', shipping: 'Free shipping', mode: 'Buy', condition:'Like New', country:'Belgium', brand:'Third-party compatible', estimatedDelivery:'3–5 business days', localPickup:true, verified:false, description:'Wireless dual-stick controller with charging cable. Fully tested and reset.' },
];

export const euro = (value: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
