export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export const ok = <T>(data: T): ApiSuccess<T> => ({
  success: true,
  data
});
