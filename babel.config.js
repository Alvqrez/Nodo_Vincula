/** Usa el preset de Expo y convierte las dos importaciones de configuración de @env en valores de compilación. */

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // El alias @env solo expone estas variables al código de Expo. Se resuelven al transformar el código.
    plugins: [
      ['module:react-native-dotenv', {
        moduleName: '@env',
        path: '.env.local',
        allowlist: ['REACT_APP_API_URL', 'REACT_APP_NODO_URL'],
        safe: false,
        allowUndefined: true,
      }]
    ]
  };
};
