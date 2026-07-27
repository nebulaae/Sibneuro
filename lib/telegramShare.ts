/**
 * Нативная «пересылка» текста сообщения в любой чат Telegram.
 *
 * Открывает системный шэринг Telegram (t.me/share/url) через
 * WebApp.openTelegramLink — это показывает нативный выбор чата, куда
 * можно переслать текст. Вне Telegram — фоллбэк на navigator.share и
 * буфер обмена.
 */

interface WebAppLike {
  openTelegramLink?: (url: string) => void;
}

function getWebApp(): WebAppLike | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as {
    Telegram?: { WebApp?: WebAppLike };
    WebApp?: WebAppLike;
  };
  return w.Telegram?.WebApp ?? w.WebApp;
}

export async function forwardTextToTelegram(text: string): Promise<boolean> {
  const value = (text || '').trim();
  if (!value) return false;

  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(value)}`;

  const wa = getWebApp();
  if (wa?.openTelegramLink) {
    wa.openTelegramLink(shareUrl);
    return true;
  }

  // Фоллбэк вне мессенджера
  try {
    if (navigator.share) {
      await navigator.share({ text: value });
      return true;
    }
  } catch {
    return false;
  }

  try {
    window.open(shareUrl, '_blank');
    return true;
  } catch {
    return false;
  }
}
