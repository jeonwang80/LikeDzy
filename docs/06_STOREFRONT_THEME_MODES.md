# Storefront theme modes

The customer storefront supports `light` and `dark` color modes.

- `dark` uses the brighter Mist Forest palette with layered sage and blue-gray gradients.
- `light` restores the original white storefront palette and is the default when no preference has been saved.
- The header mode selector updates the page immediately and saves the choice in `localStorage` under `likedzy-storefront-theme`.
- `Storefront.jsx` applies `storefront-theme` or `storefront-light` to the document body. Storefront-only components should use the shared color tokens or one of these scoped body classes.
- The preference is removed from the active document classes when the storefront route unmounts, so admin and account screens keep their own styling.
