export type Conversation = {
  id: string;
  name: string;
  preview: string;
  time: string;
  image: string;
  country: string;
  messages: Array<{ from: 'me' | 'them'; text: string; translated?: string }>;
};

export const conversations: Conversation[] = [
  {
    id: 'ana-spain', name: 'Ana (Spain)', preview: 'Hola! Quiero encargar una espada…', time: '2m', image: '/category-artist.png', country: 'Spain',
    messages: [
      { from: 'them', text: 'Hola! Quiero encargar una espada para mi cosplay.', translated: 'Ciao! Vorrei commissionare una spada per il mio cosplay.' },
      { from: 'me', text: 'Certo! Mandami il personaggio e alcune immagini di riferimento.' },
      { from: 'them', text: 'Es para un cosplay de Genshin Impact. ¿Cuánto tiempo necesitas?', translated: 'È per un cosplay di Genshin Impact. Quanto tempo ti serve?' },
    ],
  },
  {
    id: 'lucas-brazil', name: 'Lucas (Brazil)', preview: 'Quando você pode enviar?', time: '15m', image: '/hd-category-figures.png', country: 'Brazil',
    messages: [
      { from: 'them', text: 'Quando você pode enviar?', translated: 'Quando puoi spedire?' },
      { from: 'me', text: 'Posso preparare la spedizione entro due giorni.' },
    ],
  },
  {
    id: 'yuki-japan', name: 'Yuki (Japan)', preview: 'この衣装のサイズはありますか？', time: '1h', image: '/cosmora-hero.jpg', country: 'Japan',
    messages: [
      { from: 'them', text: 'この衣装のサイズはありますか？', translated: 'Avete questo costume nella mia taglia?' },
      { from: 'me', text: 'Sì, posso verificare. Indicami altezza e misure principali.' },
    ],
  },
  {
    id: 'mangavault', name: 'MangaVault', preview: 'Your order has shipped.', time: '3h', image: '/hd-category-manga.png', country: 'United Kingdom',
    messages: [
      { from: 'them', text: 'Your order has shipped. Tracking is now available.', translated: 'Il tuo ordine è stato spedito. Il tracciamento è ora disponibile.' },
      { from: 'me', text: 'Perfetto, grazie!' },
    ],
  },
  {
    id: 'stardust-atelier', name: 'Stardust Atelier', preview: 'Scrivi un messaggio a Stardust Atelier', time: 'now', image: '/category-artist.png', country: 'Italy',
    messages: [{ from: 'them', text: 'Ciao! Come posso aiutarti con il tuo prossimo cosplay?' }],
  },
];

export function getConversation(id: string) {
  return conversations.find((conversation) => conversation.id === id);
}
