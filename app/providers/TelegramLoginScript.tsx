'use client';

import Script from 'next/script';
import { useBot } from '@/app/providers/BotProvider';

export const TelegramLoginScript = () => {
    const { bot } = useBot();

    if (!bot?.bot_id) return null;

    return (
        <Script
            id="telegram-login"
            strategy="afterInteractive"
            src="https://oauth.telegram.org/js/telegram-login.js?5"
            data-client-id={String(bot.bot_id)}
            onLoad={() => {
                // Инициализируем сразу после загрузки библиотеки
                (window as any).Telegram?.Login?.init?.(
                    {
                        client_id: bot.bot_id,
                        request_access: ['write', 'phone'],
                    },
                    (result: any) => {
                        // callback для data-onauth — можно оставить пустым,
                        // openTelegramLogin использует свой callback
                        if (result && !result.error) {
                            console.log('Telegram init auth:', result);
                        }
                    }
                );
            }}
        />
    );
};