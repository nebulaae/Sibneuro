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
            onLoad={() => {
                try {
                    if ((window as any).Telegram?.Login) {
                        (window as any).Telegram.Login.init(
                            {
                                client_id: Number(bot.bot_id),
                                request_access: ['write', 'phone'],
                            },
                            (result: any) => {
                                if (result && !result.error) {
                                    console.log('Telegram init auth success:', result);
                                }
                            }
                        );
                    }
                } catch (err) {
                    console.error('Failed to initialize Telegram Login SDK:', err);
                }
            }}
        />
    );
};