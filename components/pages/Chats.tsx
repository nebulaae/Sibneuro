'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useChats } from '@/hooks/useChats';
import { useAIModels } from '@/hooks/useModels';
import { useRoles } from '@/hooks/useRoles';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { ChatsLoader } from '@/components/states/Loading';
import { ChatsEmpty } from '@/components/states/Empty';
import { ErrorComponent } from '@/components/states/Error';
import {
  MessageSquarePlus,
  Loader2,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import { toast } from 'sonner';
import { useHaptic } from '@/hooks/useHaptic';
import { useTranslations } from 'next-intl';

const ACCENT_CYAN = '#06b6d4';

function cacheDialogueModel(
  dialogueId: string,
  model: string,
  version: string,
  roleId: number | null | undefined
) {
  try {
    sessionStorage.setItem(
      `dialogue_model_${dialogueId}`,
      JSON.stringify({ model, version, role_id: roleId ?? null })
    );
  } catch { }
}

export const Chats = () => {
  const t = useTranslations('Chats');
  const router = useRouter();
  const searchParams = useSearchParams();
  const haptic = useHaptic();

  const modelParam = searchParams.get('model');
  const roleParam = searchParams.get('role');

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useChats();

  const { data: models } = useAIModels();
  const { data: roles } = useRoles();

  const chats = data?.pages.flatMap((p) => p) ?? [];
  const startedRef = useRef(false);

  // ==================== Логика открытия чата по параметрам ====================
  useEffect(() => {
    if (!modelParam && !roleParam) return;
    if (startedRef.current) return;
    if (!models || (roleParam && !roles)) return;

    const role = roleParam
      ? roles?.find((r) => r.id === parseInt(roleParam))
      : null;

    if (roleParam && !role) {
      toast.error(t('assistantNotFound'));
      router.replace('/chats');
      return;
    }

    let techName: string | null = null;
    let version: string | undefined;

    if (modelParam) {
      const model = models?.find((m) => m.tech_name === modelParam);
      if (!model) {
        toast.error(t('modelNotFound'));
        router.replace('/chats');
        return;
      }
      techName = model.tech_name;
      version = (model.versions?.find((v) => v.default) || model.versions?.[0])
        ?.label;
    } else if (roleParam && role) {
      const textModel = models?.find(
        (m) => m.categories?.includes('text') || m.mainCategory === 'text'
      );
      techName = textModel?.tech_name || null;
      version = (
        textModel?.versions?.find((v) => v.default) || textModel?.versions?.[0]
      )?.label;
    }

    if (!techName) {
      toast.error(t('suitableModelNotFound'));
      router.replace('/chats');
      return;
    }

    startedRef.current = true;

    const params = new URLSearchParams({
      model: techName,
      ...(version ? { version } : {}),
      ...(role ? { role: String(role.id) } : {}),
    });

    router.replace(`/chats/new?${params.toString()}`);
  }, [modelParam, roleParam, models, roles, router, t]);

  // ==================== Error State ====================
  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-svh p-8 text-center">
        <div className="max-w-xs flex flex-col items-center gap-6">
          <div className="w-20 h-20 rounded-[32px] bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
            <MessageSquarePlus size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white mb-2">
              {t('error')}
            </h2>
            <p className="text-white/40 font-medium leading-relaxed">
              {t('errorLoadChats')}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 font-bold hover:bg-white/10 transition-all active:scale-95"
          >
            {t('retry') || 'Повторить'}
          </button>
        </div>
      </div>
    );
  }

  // ==================== Loading new chat ====================
  if ((modelParam || roleParam) && !startedRef.current) {
    return (
      <div className="flex flex-col items-center justify-center min-h-svh gap-6">
        <div className="w-16 h-16 rounded-[24px] bg-zinc-900 border border-white/5 flex items-center justify-center shadow-2xl">
          <Loader2 className="size-8 animate-spin" style={{ color: ACCENT_CYAN }} />
        </div>
        <p className="text-[15px] font-black text-white/30 tracking-tight">
          {t('openingChat')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-svh pb-32 w-full max-w-2xl mx-auto">
      {/* Header */}
      <header className="sticky top-0 z-50 px-5 py-4 flex items-center justify-between">
        <h1 className="text-[30px] font-black tracking-tight bg-gradient-to-r from-cyan-200 via-sky-300 to-emerald-200 bg-clip-text text-transparent leading-tight">
          {t('title')}
        </h1>

        <button
          onClick={() => {
            haptic.light();
            router.push('/models');
          }}
          className="w-12 h-12 rounded-[20px] flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)] active:scale-90 transition-all"
          style={{ backgroundColor: ACCENT_CYAN, color: 'white' }}
        >
          <Plus size={24} />
        </button>
      </header>

      {/* Chat List */}
      <div className="flex flex-col flex-1 px-4 py-4">
        {isLoading ? (
          <ChatsLoader />
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-6 text-center py-20 px-10">
            <div className="w-24 h-24 rounded-[40px] bg-zinc-900 border border-white/10 flex items-center justify-center text-5xl shadow-inner">
              💬
            </div>
            <div>
              <h3 className="text-xl font-black text-white mb-2">
                {t('noChatsTitle') || 'Чатов пока нет'}
              </h3>
              <p className="text-white/30 font-medium leading-relaxed">
                {t('noChatsDesc') || 'Начните первый разговор с ИИ'}
              </p>
            </div>
            <button
              onClick={() => router.push('/models')}
              className="px-8 py-3.5 rounded-full font-black text-[15px] shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-95 transition-all"
              style={{ backgroundColor: ACCENT_CYAN, color: 'white' }}
            >
              {t('newChat')}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {chats.map((chat) => {
              const displayName =
                chat.version || chat.title || chat.model || t('dialogue');

              return (
                <button
                  key={chat.dialogue_id}
                  onClick={() => {
                    haptic.light();
                    if (chat.model) {
                      cacheDialogueModel(
                        chat.dialogue_id,
                        chat.model,
                        chat.version,
                        chat.role_id
                      );
                    }
                    router.push(`/chats/${chat.dialogue_id}`);
                  }}
                  className="flex items-center gap-4 p-5 rounded-[32px] bg-zinc-900/30 border border-white/5 hover:border-white/15 transition-all group active:scale-[0.985]"
                >
                  <Avatar className="size-14 rounded-[22px] border border-white/10 group-hover:border-cyan-400/30 transition-colors shadow-lg">
                    <AvatarImage
                      src={
                        chat.avatar ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=18181b&color=ffffff`
                      }
                    />
                    <AvatarFallback className="bg-zinc-800 text-[14px] font-black text-white/40">
                      {displayName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-[17px] font-black text-white group-hover:text-cyan-400 transition-colors truncate tracking-tight">
                      {chat.title || displayName}
                    </div>
                    <div className="text-[13px] text-white/40 font-medium truncate mt-0.5">
                      {chat.title || chat.model}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-[11px] font-black text-white/20 uppercase tracking-widest bg-white/5 px-2.5 py-1 rounded-lg group-hover:bg-cyan-400/10 group-hover:text-cyan-400 transition-all">
                      {timeAgo(chat.last_activity || chat.started_at)}
                    </span>
                    <ChevronRight
                      size={18}
                      className="text-white/10 group-hover:text-white group-hover:translate-x-1 transition-all"
                    />
                  </div>
                </button>
              );
            })}

            {hasNextPage && (
              <button
                onClick={() => {
                  haptic.light();
                  fetchNextPage();
                }}
                disabled={isFetchingNextPage}
                className="w-full py-5 rounded-[28px] bg-white/5 border border-white/5 text-[14px] font-black text-white/30 hover:bg-white/10 hover:text-white transition-all active:scale-[0.98] mt-4"
              >
                {isFetchingNextPage ? (
                  <Loader2 className="size-5 animate-spin mx-auto" />
                ) : (
                  t('loadMore')
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Chats;