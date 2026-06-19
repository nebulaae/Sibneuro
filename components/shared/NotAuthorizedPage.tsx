'use client';

import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { Sparkles, Zap, Layers, Flame, Gift, ArrowRight } from 'lucide-react';
import { useAIModels } from '@/hooks/useModels';
import { useRoles } from '@/hooks/useRoles';
import { useInfinitePosts, type Post } from '@/hooks/usePosts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SmartImage } from '@/components/shared/SmartImage';
import { useHaptic } from '@/hooks/useHaptic';
import { resolvePostMedia } from '@/lib/media';
import { localize, cn } from '@/lib/utils';

/**
 * Единый guest-экран. Показывается вместо пустых страниц / ошибок доступа /
 * технических сообщений — мотивирует зарегистрироваться (требование #2).
 *
 * Деградирует мягко: если /models или /roles недоступны гостю (401), секции
 * просто не рендерятся — hero, примеры работ и CTA остаются на месте.
 */
export function NotAuthorizedPage() {
  const t = useTranslations('Guest');
  const locale = useLocale();
  const router = useRouter();
  const haptic = useHaptic();

  const { data: models } = useAIModels();
  const { data: roles } = useRoles();
  const { data: postsData } = useInfinitePosts({ limit: 9 });

  const popularModels = (models || []).slice(0, 8);
  const popularRoles = (roles || []).slice(0, 8);
  const examplePosts: Post[] = (postsData?.pages?.[0]?.items || []).slice(0, 6);

  const goLogin = () => {
    haptic.medium();
    router.push('/login');
  };

  const BENEFITS = [
    { icon: Zap, title: t('b1Title'), desc: t('b1Desc') },
    { icon: Layers, title: t('b2Title'), desc: t('b2Desc') },
    { icon: Flame, title: t('b3Title'), desc: t('b3Desc') },
    { icon: Gift, title: t('b4Title'), desc: t('b4Desc') },
  ];

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto pb-40">
      {/* Hero */}
      <section className="relative px-6 pt-16 pb-10 text-center overflow-hidden">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[420px] h-[420px] rounded-full bg-cyan-400/10 blur-[120px] pointer-events-none" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6"
        >
          <Sparkles size={14} className="text-cyan-400" />
          <span className="text-[12px] font-black text-white/70 uppercase tracking-widest">
            AI Studio
          </span>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="relative text-[34px] leading-[1.05] font-black tracking-tight text-white mb-4"
        >
          {t('heroTitle')}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="relative text-[16px] font-medium text-white/45 max-w-[440px] mx-auto leading-relaxed"
        >
          {t('heroSubtitle')}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="relative flex flex-col gap-3 mt-8 max-w-[360px] mx-auto"
        >
          <button
            onClick={goLogin}
            className="w-full h-14 rounded-2xl bg-cyan-500 text-black font-black text-[16px] flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(34,211,238,0.4)] active:scale-[0.98] transition-all"
          >
            {t('ctaRegister')}
            <ArrowRight size={18} />
          </button>
          <button
            onClick={goLogin}
            className="w-full h-12 rounded-2xl bg-white/5 border border-white/10 text-white/70 font-bold text-[14px] active:scale-[0.98] transition-all"
          >
            {t('ctaLogin')}
          </button>
          <p className="text-[12px] text-white/30 font-medium mt-1">
            {t('footnote')}
          </p>
        </motion.div>
      </section>

      {/* Benefits */}
      <section className="px-6 pt-2">
        <h2 className="text-[13px] font-black uppercase tracking-widest text-white/30 mb-4 px-1">
          {t('benefitsTitle')}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {BENEFITS.map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={b.title}
                className="rounded-3xl bg-zinc-900/40 border border-white/10 p-4 flex flex-col gap-2"
              >
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center">
                  <Icon size={18} className="text-cyan-400" />
                </div>
                <p className="text-[15px] font-black text-white leading-tight">
                  {b.title}
                </p>
                <p className="text-[12px] font-medium text-white/40 leading-snug">
                  {b.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Example generations */}
      {examplePosts.length > 0 && (
        <section className="px-6 pt-10">
          <h2 className="text-[13px] font-black uppercase tracking-widest text-white/30 mb-4 px-1">
            {t('examples')}
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {examplePosts.map((p) => {
              const { url } = resolvePostMedia(p);
              return (
                <button
                  key={p.id}
                  onClick={goLogin}
                  className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-white/10 active:scale-[0.97] transition-transform"
                >
                  <SmartImage
                    src={url}
                    className="absolute inset-0 w-full h-full"
                    ctx={{ surface: 'guest-examples', postId: p.id }}
                  />
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Popular models */}
      {popularModels.length > 0 && (
        <section className="pt-10">
          <h2 className="text-[13px] font-black uppercase tracking-widest text-white/30 mb-4 px-7">
            {t('popularModels')}
          </h2>
          <div className="flex gap-3 overflow-x-auto px-6 pb-2 [&::-webkit-scrollbar]:hidden">
            {popularModels.map((m) => (
              <button
                key={m.tech_name}
                onClick={goLogin}
                className="shrink-0 w-[120px] flex flex-col items-center gap-2 rounded-3xl bg-zinc-900/40 border border-white/10 p-3 active:scale-[0.97] transition-transform"
              >
                <Avatar className="size-16">
                  <AvatarImage src={m.avatar} />
                  <AvatarFallback>{m.model_name[0]}</AvatarFallback>
                </Avatar>
                <span className="text-[13px] font-bold text-white text-center leading-tight truncate w-full">
                  {m.model_name}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Popular roles */}
      {popularRoles.length > 0 && (
        <section className="pt-8">
          <h2 className="text-[13px] font-black uppercase tracking-widest text-white/30 mb-4 px-7">
            {t('popularRoles')}
          </h2>
          <div className="flex gap-3 overflow-x-auto px-6 pb-2 [&::-webkit-scrollbar]:hidden">
            {popularRoles.map((r) => (
              <button
                key={r.id}
                onClick={goLogin}
                className={cn(
                  'shrink-0 w-[130px] rounded-3xl overflow-hidden border border-white/10 bg-zinc-900/40 active:scale-[0.97] transition-transform text-left'
                )}
              >
                <div className="relative aspect-square w-full">
                  <SmartImage
                    src={r.image}
                    className="absolute inset-0 w-full h-full"
                    ctx={{ surface: 'guest-roles', roleId: r.id }}
                  />
                </div>
                <div className="p-2.5">
                  <span className="text-[13px] font-bold text-white truncate block">
                    {localize(r.label, locale)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Bottom CTA */}
      <section className="px-6 pt-12">
        <button
          onClick={goLogin}
          className="w-full h-14 rounded-2xl bg-cyan-500 text-black font-black text-[16px] flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(34,211,238,0.4)] active:scale-[0.98] transition-all"
        >
          {t('ctaRegister')}
          <ArrowRight size={18} />
        </button>
      </section>
    </div>
  );
}

export default NotAuthorizedPage;
