/** Licensed, uncropped event images. Full provenance: docs/event-image-sources.json. */
export type EventMedia = {
  image: string;
  sourceUrl: string;
  credit: string;
  licenseLabel: string;
  licenseUrl: string;
  imageYear: number | null;
  kind: 'photo' | 'logo';
  archive: boolean;
};

// Only verified assets are mapped. Other events use their COSMORA typographic cover.
export const EVENT_MEDIA: Partial<Record<string, EventMedia>> = {
  "AnimagiC": {
    "image": "/events/licensed/animagic-2018.jpg",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Cosplay_am_Mannheimer_Wasserturm_01.jpg",
    "credit": "Immanuel Giel / Wikimedia Commons",
    "licenseLabel": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
    "imageYear": 2018,
    "kind": "photo",
    "archive": true
  },
  "BD Comic Strip Festival": {
    "image": "/events/licensed/bd-comic-strip-festival-2023.jpg",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:BD_Comic_Strip_Festival.jpg",
    "credit": "Lafloche / Wikimedia Commons",
    "licenseLabel": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
    "imageYear": 2023,
    "kind": "photo",
    "archive": true
  },
  "Comic Barcelona": {
    "image": "/events/licensed/comic-barcelona-2017.jpg",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Sal%C3%B3_del_C%C3%B2mic_de_Barcelona_2017_-_001.jpg",
    "credit": "Jordiferrer / Wikimedia Commons",
    "licenseLabel": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
    "imageYear": 2017,
    "kind": "photo",
    "archive": true
  },
  "COMICON Napoli": {
    "image": "/events/licensed/comicon-napoli-2026.png",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Comicon-napoli-2026_day-2.png",
    "credit": "SpudDodge / Wikimedia Commons",
    "licenseLabel": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
    "imageYear": 2026,
    "kind": "photo",
    "archive": false
  },
  "Japan Expo Paris": {
    "image": "/events/licensed/japan-expo-2026.jpg",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Japan_Expo_2026,_vue_g%C3%A9n%C3%A9rale_du_hall_5.jpg",
    "credit": "Eunostos / Wikimedia Commons",
    "licenseLabel": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
    "imageYear": 2026,
    "kind": "photo",
    "archive": false
  },
  "Lucca Comics & Games": {
    "image": "/events/licensed/lucca-comics-2017.jpg",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Lucca_-_Chiesa_dei_Servi_durante_il_Comics_2017_01.jpg",
    "credit": "Syrio / Wikimedia Commons",
    "licenseLabel": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
    "imageYear": 2017,
    "kind": "photo",
    "archive": true
  },
  "Manga Barcelona": {
    "image": "/events/licensed/manga-barcelona-2024.jpg",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Fanzines_-_Manga_BCN_24.jpg",
    "credit": "Ferran Cornellà / Wikimedia Commons",
    "licenseLabel": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
    "imageYear": 2024,
    "kind": "photo",
    "archive": true
  },
  "Paris Games Week": {
    "image": "/events/licensed/paris-games-week-2016.jpg",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:ESWC_Paris_Games_Week_2016.jpg",
    "credit": "FR / Wikimedia Commons",
    "licenseLabel": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
    "imageYear": 2016,
    "kind": "photo",
    "archive": true
  },
  "Romics Fall": {
    "image": "/events/licensed/romics-fall-2024.jpg",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Romics_XXIII_8.jpg",
    "credit": "Nicholas Gemini / Wikimedia Commons",
    "licenseLabel": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
    "imageYear": 2024,
    "kind": "photo",
    "archive": true
  },
  "Romics Spring": {
    "image": "/events/licensed/romics-spring-2025.jpg",
    "sourceUrl": "https://commons.wikimedia.org/wiki/File:Romics_2025_-_Spring_Edition_01.jpg",
    "credit": "Nicholas Gemini / Wikimedia Commons",
    "licenseLabel": "CC BY-SA 4.0",
    "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
    "imageYear": 2025,
    "kind": "photo",
    "archive": true
  },
  "Comic Con Brussels Spring": {
    "image": "/events/licensed/comic-con-brussels-logo.jpg",
    "sourceUrl": "https://comicconbrussels.com/en/press/",
    "credit": "Comic Con Brussels / Comic Con Group",
    "licenseLabel": "Official promotional permission",
    "licenseUrl": "https://comicconbrussels.com/en/press/",
    "imageYear": null,
    "kind": "logo",
    "archive": false
  },
  "Comic Con Brussels Fall": {
    "image": "/events/licensed/comic-con-brussels-logo.jpg",
    "sourceUrl": "https://comicconbrussels.com/en/press/",
    "credit": "Comic Con Brussels / Comic Con Group",
    "licenseLabel": "Official promotional permission",
    "licenseUrl": "https://comicconbrussels.com/en/press/",
    "imageYear": null,
    "kind": "logo",
    "archive": false
  },
  "Comic Con Holland — Greater Amsterdam": {
    "image": "/events/licensed/comic-con-holland-official-logo.webp",
    "sourceUrl": "https://comicconholland.nl/en/homepage-en/",
    "credit": "Comic Con Holland / Comic Con Group",
    "licenseLabel": "Official logo promotional permission",
    "licenseUrl": "https://comicconholland.nl/en/press/",
    "imageYear": null,
    "kind": "logo",
    "archive": false
  },
  "Comic Con Holland — Den Bosch": {
    "image": "/events/licensed/comic-con-holland-official-logo.webp",
    "sourceUrl": "https://comicconholland.nl/en/homepage-en/",
    "credit": "Comic Con Holland / Comic Con Group",
    "licenseLabel": "Official logo promotional permission",
    "licenseUrl": "https://comicconholland.nl/en/press/",
    "imageYear": null,
    "kind": "logo",
    "archive": false
  }
};
