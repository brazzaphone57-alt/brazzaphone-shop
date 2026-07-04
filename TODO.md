# TODO — Optimisation chargement boutique Brazzaphone

- [x] 1) Diagnostiquer: la fonction `/.netlify/functions/save-products` renvoie toute la liste produits depuis `@netlify/blobs` (payload potentiellement énorme si images en base64)
- [x] 2) Ajouter `Cache-Control` + `s-maxage` sur la réponse **GET** de `netlify/functions/save-products.js`
- [ ] 3) Déployer et re-tester: cold start vs warm start, et TTFB/transfer (Chrome DevTools → Network)
- [ ] 4) Migration images: enlever les images base64 du JSON produits
  - Stocker images en fichier binaire (Netlify Blobs en mode fichier) ou service externe (Cloudinary/imgbb)
  - Conserver dans le JSON uniquement des URLs d’images
- [ ] 5) Compresser/redimensionner images côté admin avant upload (max 800-1000px, WebP si possible)
- [ ] 6) Ajouter/ajuster headers cache côté images (long cache) + éventuellement ETag/If-None-Match JSON
- [ ] 7) Valider performance: passer ~12s → <2-3s sur la home

