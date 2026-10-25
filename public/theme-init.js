// Resolve the palette before Angular renders to avoid a bright flash at night.
(() => {
  let preference = null;
  try {
    preference = localStorage.getItem('stitchweather.theme');
  } catch {
    // Private browsing can disable storage; the system preference still works.
  }
  const mode =
    preference === 'light' || preference === 'dark'
      ? preference
      : window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
  document.documentElement.dataset.theme = mode;
  document.querySelector('meta[name="theme-color"]').content =
    mode === 'dark' ? '#0c1b2b' : '#eefaff';
})();
