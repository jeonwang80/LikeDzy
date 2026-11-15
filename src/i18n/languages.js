export const EDITOR_LANGUAGES = [
  { code: 'ko', suffix: 'Ko', label: '한국어' },
  { code: 'en', suffix: 'En', label: 'English' },
  { code: 'vi', suffix: 'Vi', label: 'Tiếng Việt' },
  { code: 'hu', suffix: 'Hu', label: 'Magyar' },
];
export const languageLabel = code => EDITOR_LANGUAGES.find(item => item.code === code)?.label || '한국어';
