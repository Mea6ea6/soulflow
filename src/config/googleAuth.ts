// Client ID публичный — безопасно хранить в клиентском коде.
// Client Secret из консоли Google НЕ используется этим флоу авторизации
// и нигде в проекте не должен появляться.
export const GOOGLE_CLIENT_ID = '60744843046-6sj9vvr15cfvb9mr5ila3aeb8eeubluo.apps.googleusercontent.com';

// appdata — доступ только к скрытой папке данных этого приложения,
// не ко всему Google Drive пользователя
export const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';