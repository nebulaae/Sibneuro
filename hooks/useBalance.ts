import { useUser } from '@/hooks/useUser';

/**
 * Баланс токенов для шапки.
 *
 * Существует отдельно от useUser ради одного различия, которого раньше не
 * было: «на счету ноль» и «мы ещё не знаем баланс» — разные состояния.
 * Везде стояло `tokens ?? 0`, поэтому непрогруженный или упавший запрос
 * рисовался как честный ноль, и пользователь видел «все токены списались».
 *
 * `tokens === null` означает «неизвестно» — в таком случае показываем
 * плейсхолдер, а не цифру.
 */
export function useBalance() {
  const { data, isPending, isError, isFetching, refetch } = useUser();

  const raw = data?.user?.tokens;
  const known = raw !== undefined && raw !== null;
  const parsed = Math.trunc(Number(raw));

  return {
    tokens: known && Number.isFinite(parsed) ? parsed : null,
    known,
    isPending,
    isError,
    isFetching,
    refetch,
  };
}
