export const getYourKey = (): string | null => {
  return localStorage.getItem('YOUR_KEY');
};

export const setYourKey = (key: string): void => {
  localStorage.setItem('YOUR_KEY', key);
};
