export const MAX_PAGE_SIZE = 100;

export function normalizePagination(
  pageInput: unknown,
  limitInput: unknown,
  defaultLimit = 10,
) {
  const parsedPage = Number(pageInput);
  const parsedLimit = Number(limitInput);

  const page =
    Number.isFinite(parsedPage) && parsedPage > 0 ? Math.floor(parsedPage) : 1;
  const requestedLimit =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.floor(parsedLimit)
      : defaultLimit;
  const limit = Math.min(requestedLimit, MAX_PAGE_SIZE);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}
