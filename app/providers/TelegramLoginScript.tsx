'use client';

import Script from 'next/script';
import { useBot } from '@/app/providers/BotProvider';

export const TelegramLoginScript = () => {
    const { bot } = useBot();

    if (!bot?.bot_id) {
        return null;
    }

    return (
        <Script
            id="telegram-login"
            strategy="afterInteractive"
            src="https://oauth.telegram.org/js/telegram-login.js?5"
            data-client-id={String(bot.bot_id)}
            data-onauth="console.log(data)"
            data-request-access="write phone"
        />
    );
}