import { defineConfig } from 'vitest/config';

// Lu par `ng test` (angular.json → test.options.runnerConfig)
export default defineConfig({
  test: {
    // Logs écrits directement sur la sortie : un console.log émis juste avant la fin d'un fichier de test
    // ne peut plus échouer la commande (« Closing rpc while onUserConsoleLog was pending »).
    disableConsoleIntercept: true,
  },
});
