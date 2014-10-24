requirejs.config({
  'baseUrl': 'scripts/lib',
  'paths': {
    'app': '../app',
  }
});

requirejs(['app/main']);
