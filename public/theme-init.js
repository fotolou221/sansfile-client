// Restaure le thème avant le premier affichage (évite un flash blanc en mode sombre).
// Fichier externe : la politique de sécurité (CSP) interdit les scripts en ligne.
(function() {
  try {
    var theme = localStorage.getItem('sansfile-app-theme');
    var isDark = false;
    if (theme === 'dark') {
      isDark = true;
    } else if (theme === 'light') {
      isDark = false;
    } else {
      // 'system' or default
      isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    if (isDark) {
      document.documentElement.classList.add('dark-theme');
      document.documentElement.setAttribute('data-theme', 'dark');
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', '#0b132b');
    } else {
      document.documentElement.classList.remove('dark-theme');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  } catch (e) {}
})();
