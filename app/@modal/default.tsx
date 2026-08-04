// Required for the @modal parallel slot: on any route that isn't the
// intercepted (.)read/[slug] page below (a hard refresh, a direct link, or
// simply browsing a route that never triggered the modal), Next has nothing
// to render into this slot — without this file, that would 404 the whole
// route instead of just rendering the rest of the page normally.
export default function ModalDefault() {
  return null;
}
