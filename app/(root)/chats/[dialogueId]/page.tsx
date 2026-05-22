'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useChatHistory, useUpload } from '@/hooks/useApiExtras';
import {
  useGenerateAI,
  convertMediaToInputs,
  normalizeResultMedia,
} from '@/hooks/useGenerations';
import { useAIModels } from '@/hooks/useModels';
import { useRoles } from '@/hooks/useRoles';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  ChevronLeft,
  Send,
  ImagePlus,
  Loader2,
  X,
  Download,
  Pause,
  Play,
  Share2,
  Clock,
  CheckCheck,
} from 'lucide-react';
import { PublishDialog } from '@/components/dialogs/PublishDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { useHaptic } from '@/hooks/useHaptic';
import { cn, localize } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

/* ── Types ── */
interface MediaItem {
  type?: string;
  url?: string;
  input?: string | { type: string; format: string; input: string };
  format?: string;
}
interface Message {
  id: number;
  model: string;
  version: string;
  role_id?: number | null;
  inputs?: {
    text?: string;
    image?: string[];
    video?: string[];
    audio?: string[];
    media?: MediaItem[];
  };
  result?: { text?: string; media?: MediaItem[] };
  status: 'completed' | 'processing' | 'error' | 'pending';
  error?: string | null;
  cost?: number;
  post_id?: number | null;
  created_at?: string;
}

/* ── Glass tokens (aligned with Home) ── */
const glass = {
  thin: 'bg-white/[.06] backdrop-blur-xl border border-white/[.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]',
  card: 'bg-white/[.055] backdrop-blur-2xl border border-white/[.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_4px_20px_rgba(0,0,0,0.25)]',
  cyan: 'bg-cyan-400/[.10] border border-cyan-400/[.22] shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_6px_24px_rgba(34,211,238,0.14)]',
};

/* ── sessionStorage helpers ── */
const STORAGE_KEY = (id: string) => `dialogue_model_${id}`;

function readStoredModel(id: string) {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY(id));
    if (raw) return JSON.parse(raw) as { model: string; version: string; role_id: number | null };
  } catch { }
  return null;
}

function writeStoredModel(id: string, model: string, version: string, role_id: number | null) {
  try {
    sessionStorage.setItem(STORAGE_KEY(id), JSON.stringify({ model, version, role_id }));
  } catch { }
}

function getDialogueModel(
  dialogueId: string | null,
  messages: Message[],
  urlParams?: { model?: string | null; version?: string | null; role?: string | null }
): { model: string | null; version: string | null; roleId: number | null } {
  if (!dialogueId) return { model: null, version: null, roleId: null };
  if (dialogueId === 'new') {
    if (urlParams?.model) {
      const roleId = urlParams.role ? parseInt(urlParams.role) : null;
      return { model: urlParams.model, version: urlParams.version ?? null, roleId: isNaN(roleId as number) ? null : roleId };
    }
    return { model: null, version: null, roleId: null };
  }
  let fromHistory = messages.find((m) => m.model);
  if (!fromHistory && messages.length > 0) fromHistory = messages[0];
  if (fromHistory && (fromHistory.model || fromHistory.version)) {
    const model = fromHistory.model || fromHistory.version || '';
    const version = fromHistory.version || '';
    const roleId = fromHistory.role_id ?? null;
    writeStoredModel(dialogueId, model, version, roleId);
    return { model: model || null, version: version || null, roleId };
  }
  const cached = readStoredModel(dialogueId);
  if (cached) return { model: cached.model, version: cached.version, roleId: cached.role_id };
  return { model: null, version: null, roleId: null };
}

function extractDisplayMedia(inputs: Message['inputs']): { url: string; type: string }[] {
  const r: { url: string; type: string }[] = [];
  if (!inputs) return r;
  (inputs.image || []).forEach((url) => r.push({ url, type: 'image' }));
  (inputs.video || []).forEach((url) => r.push({ url, type: 'video' }));
  (inputs.audio || []).forEach((url) => r.push({ url, type: 'audio' }));
  (inputs.media || []).forEach((m) => {
    let url = '';
    let type = 'image';
    if (typeof m.input === 'object' && m.input !== null) {
      url = m.input.input || '';
      type = m.input.type || 'image';
    } else {
      url = m.url || m.input || '';
      type = m.type || 'image';
    }
    if (url) r.push({ url, type });
  });
  return r;
}

function extractResultMedia(result: Message['result']) {
  return result?.media ? normalizeResultMedia(result.media) : [];
}

/* ── Audio Player ── */
function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying) a.pause();
    else a.play();
  };

  const fmt = (t: number) => {
    if (!t) return '0:00';
    return `${Math.floor(t / 60)}:${Math.floor(t % 60).toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const play = () => setIsPlaying(true);
    const pause = () => setIsPlaying(false);
    a.addEventListener('play', play);
    a.addEventListener('pause', pause);
    return () => { a.removeEventListener('play', play); a.removeEventListener('pause', pause); };
  }, []);

  return (
    <div className={cn('flex flex-col gap-3 w-full p-4 rounded-[22px]', glass.thin)}>
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={() => { const a = audioRef.current; if (a) setProgress(a.currentTime); }}
        onLoadedMetadata={() => { const a = audioRef.current; if (a) setDuration(a.duration); }}
      />
      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          className="w-11 h-11 rounded-full bg-cyan-400/15 border border-cyan-400/25 flex items-center justify-center transition-all active:scale-90"
        >
          {isPlaying
            ? <Pause size={18} className="text-cyan-300" />
            : <Play size={18} className="text-cyan-300 ml-0.5" />}
        </button>
        <div className="flex-1">
          <div className="h-1 w-full bg-white/[.08] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-sky-400 rounded-full transition-all"
              style={{ width: `${(progress / (duration || 1)) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] font-bold text-white/30 tracking-wider">
            <span>{fmt(progress)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main ── */
export default function ChatPage() {
  const t = useTranslations('ChatPage');
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams();
  const searchParams = useSearchParams();
  const dialogueId = params?.dialogueId as string | undefined;
  const haptic = useHaptic();

  const [text, setText] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<{ url: string; type: string; file: File }[]>([]);
  const [viewerSrc, setViewerSrc] = useState<{ url: string; type: string } | null>(null);
  const [publishingMessage, setPublishingMessage] = useState<Message | null>(null);
  const [optimisticMessages, setOptimisticMessages] = useState<Message[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const urlModel = searchParams.get('model');
  const urlVersion = searchParams.get('version');
  const urlRole = searchParams.get('role');

  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(urlRole ? parseInt(urlRole) : null);

  const { data: messages = [], isLoading: isHistoryLoading } = useChatHistory(
    dialogueId === 'new' ? null : dialogueId || null
  );
  const { data: allModels } = useAIModels();
  const { data: roles } = useRoles();
  const generate = useGenerateAI();
  const upload = useUpload();

  const msgsFromHistory = (messages as Message[]) || [];
  const { model: activeModel, version: activeVersion } = getDialogueModel(dialogueId!, msgsFromHistory, {
    model: urlModel, version: urlVersion, role: urlRole,
  });

  const msgs = msgsFromHistory;
  const isProcessing =
    msgs.some((m) => m.status === 'processing' || m.status === 'pending') ||
    optimisticMessages.length > 0;

  const currentModel = allModels?.find((m) => m.tech_name === activeModel);
  const currentVersion = currentModel?.versions?.find((v) => v.label === activeVersion);
  const canAttachMedia = currentModel?.input?.some((t) => ['image', 'video', 'audio'].includes(t)) ?? true;

  const chatTitle = (() => {
    const modelName = currentModel?.model_name;
    if (modelName && activeVersion) return `${modelName} · ${activeVersion}`;
    if (modelName) return modelName;
    return t('dialogue');
  })();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, optimisticMessages, scrollToBottom]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [text]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const file = files[0];
    try {
      const res = await upload.mutateAsync(file);
      setUploadedFiles((prev) => [...prev, { url: res.url, type: res.type, file }]);
    } catch { toast.error(t('uploadError')); }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (i: number) => setUploadedFiles((prev) => prev.filter((_, idx) => idx !== i));

  const handleSend = () => {
    if (isHistoryLoading || isProcessing || (!text.trim() && uploadedFiles.length === 0)) return;
    const { model: techName, version } = getDialogueModel(dialogueId!, msgsFromHistory, {
      model: urlModel, version: urlVersion, role: urlRole,
    });
    if (!techName) { toast.error(t('modelNotFound')); return; }
    haptic.light();

    const sentText = text;
    const safeText = text.trim() || (uploadedFiles.length > 0 ? t('describeImage') : '');
    const oldFormatMedia = uploadedFiles.map((f) => ({ type: f.type, format: 'url', input: f.url }));
    const inputs = convertMediaToInputs(safeText, oldFormatMedia);

    const optimisticMsg: Message = {
      id: -Date.now(),
      model: techName,
      version: version || '',
      inputs: { text: sentText, media: uploadedFiles.map((f) => ({ type: f.type, url: f.url })) },
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    setOptimisticMessages((prev) => [...prev, optimisticMsg]);
    setText('');
    setUploadedFiles([]);

    generate.mutate(
      { tech_name: techName, version: version || undefined, dialogue_id: dialogueId === 'new' ? undefined : dialogueId, role_id: selectedRoleId, inputs },
      {
        onSuccess: (data) => {
          setOptimisticMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
          if (dialogueId === 'new' && data.dialogue_id) {
            router.replace(`/chats/${data.dialogue_id}`);
          } else {
            queryClient.invalidateQueries({ queryKey: queryKeys.chatHistory(dialogueId as string) });
          }
        },
        onError: () => {
          setOptimisticMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
          setText(sentText);
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleDownload = (url: string) => {
    haptic.selection();

    // Create the secure proxy download URL
    const proxyUrl = `/api/download?url=${encodeURIComponent(url)}`;

    // For Telegram Mini Apps, use openLink with the proxy URL to trigger native browser's download manager immediately
    const isTelegram = typeof window !== 'undefined' && !!(window as any).Telegram?.WebApp;
    if (isTelegram && (window as any).Telegram?.WebApp?.openLink) {
      try {
        const absoluteProxyUrl = new URL(proxyUrl, window.location.origin).toString();
        (window as any).Telegram.WebApp.openLink(absoluteProxyUrl);
        return;
      } catch (err) {
        console.warn('[handleDownload] Telegram openLink with proxy failed, trying standard download:', err);
      }
    }

    // On standard website, set window.location.href to trigger direct immediate download without navigating away
    window.location.href = proxyUrl;
  };

  const isSendDisabled = isHistoryLoading || isProcessing || generate.isPending || (!text.trim() && uploadedFiles.length === 0);
  const showRoles = msgsFromHistory.length === 0 && !isHistoryLoading && !!roles;

  return (
    <div className="flex flex-col h-dvh max-w-2xl mx-auto w-full text-white overflow-hidden -mb-[calc(80px+max(16px,env(safe-area-inset-bottom)))] relative z-40">

      {/* ── Aurora background ── */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-20 w-[500px] h-[500px] rounded-full bg-cyan-500/[.04] blur-[120px]" />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] rounded-full bg-sky-500/[.05] blur-[100px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(34,211,238,0.08),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,7,11,0.15),#05070b_80%)]" />
      </div>

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { haptic.light(); router.back(); }}
            className="w-10 h-10 rounded-2xl bg-white/[.06] border border-white/[.10] flex items-center justify-center transition active:scale-90"
          >
            <ChevronLeft size={20} className="text-cyan-300" />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-[17px] font-black tracking-tight text-white truncate leading-tight">
              {chatTitle}
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isHistoryLoading ? (
                <span className="text-[11px] text-white/30">{t('loading')}</span>
              ) : isProcessing ? (
                <div className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.9)] animate-pulse" />
                  <span className="text-[11px] text-cyan-200/70 font-bold uppercase tracking-wider">
                    {t('generating')}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col gap-5" style={{ scrollbarWidth: 'none' }}>
        {isHistoryLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-30">
            <Loader2 size={28} className="animate-spin text-cyan-300" />
            <p className="text-[14px] font-medium">{t('loadingPlaceholder')}</p>
          </div>
        ) : msgs.length === 0 && optimisticMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-6 text-center px-8">
            <div className={cn('w-20 h-20 rounded-[28px] flex items-center justify-center', glass.thin)}>
              <span className="text-3xl">💬</span>
            </div>
            <p className="text-[16px] font-medium text-white/35 leading-relaxed">{t('startDialogue')}</p>

            {showRoles && (
              <div className="w-full max-w-sm mt-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-200/40 mb-4">
                  {t('chooseAssistant')}
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {roles!.slice(0, 4).map((role) => (
                    <button
                      key={role.id}
                      onClick={() => { haptic.light(); setSelectedRoleId(role.id); }}
                      className={cn(
                        'flex items-center gap-3 p-3.5 rounded-[20px] border transition-all active:scale-[0.98] text-left',
                        selectedRoleId === role.id
                          ? glass.cyan
                          : glass.thin + ' hover:border-white/20'
                      )}
                    >
                      <Avatar className="w-10 h-10 rounded-xl flex-shrink-0">
                        <AvatarImage src={role.image || ''} />
                        <AvatarFallback className="bg-white/[.08] text-sm font-bold">
                          {localize(role.label)[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-[14px] font-black truncate', selectedRoleId === role.id ? 'text-cyan-200' : 'text-white')}>
                          {localize(role.label)}
                        </p>
                        <p className="text-[11px] text-white/30 line-clamp-1 mt-0.5">{localize(role.description)}</p>
                      </div>
                      {selectedRoleId === role.id && (
                        <span className="size-2 rounded-full bg-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.9)] flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          [...msgs, ...optimisticMessages].map((msg, idx) => {
            const userMedia = extractDisplayMedia(msg.inputs);
            const resultMedia = extractResultMedia(msg.result);
            return (
              <div key={msg.id || idx} className="flex flex-col gap-3">
                {/* User message */}
                {(msg.inputs?.text || userMedia.length > 0) && (
                  <div className="flex justify-end pl-12">
                    <div className="flex flex-col items-end gap-1.5">
                      <div className={cn('px-4 py-3 rounded-[22px_22px_6px_22px] text-[15px] leading-relaxed', glass.thin)}>
                        {msg.inputs?.text && (
                          <p className="whitespace-pre-wrap text-white/90">{msg.inputs.text}</p>
                        )}
                        {userMedia.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {userMedia.map((m, i) => (
                              <div
                                key={i}
                                onClick={() => setViewerSrc(m)}
                                className="relative group rounded-[14px] overflow-hidden border border-white/[.12] cursor-pointer"
                              >
                                {m.type === 'image' ? (
                                  <img src={m.url} className="w-32 h-full object-cover" alt="" />
                                ) : (
                                  <div className="w-32 h-32 flex items-center justify-center bg-white/[.06] text-xl">
                                    {m.type === 'video' ? '🎬' : '🎵'}
                                  </div>
                                )}
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDownload(m.url); }}
                                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 backdrop-blur border border-white/20 opacity-0 group-hover:opacity-100 transition"
                                >
                                  <Download size={11} className="text-white" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 px-1">
                        {msg.status === 'pending'
                          ? <Clock size={10} className="text-white/20" />
                          : <CheckCheck size={11} className="text-cyan-400/60" />}
                      </div>
                    </div>
                  </div>
                )}

                {/* AI response */}
                <div className="flex justify-start pr-12">
                  <div className="flex flex-col items-start gap-2 w-full">
                    {msg.status === 'processing' || msg.status === 'pending' ? (
                      <div className={cn('px-5 py-3.5 rounded-[22px_22px_22px_6px] flex gap-1.5', glass.cyan)}>
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-cyan-300/60 animate-bounce"
                            style={{ animationDelay: `${i * 0.2}s` }}
                          />
                        ))}
                      </div>
                    ) : msg.status === 'error' ? (
                      <div className="px-4 py-3.5 rounded-[22px_22px_22px_6px] bg-red-500/[.08] border border-red-500/[.18] text-red-400 text-[14px] font-medium">
                        {msg.error || t('error')}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 w-full">
                        {msg.result?.text && (
                          <div className={cn(
                            'px-5 py-4 rounded-[22px_22px_22px_6px] text-[15px] leading-relaxed',
                            glass.thin,
                            'prose prose-invert max-w-none prose-p:leading-relaxed',
                            'prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/[.10] prose-pre:rounded-2xl prose-pre:p-4',
                            'wrap-break-word'
                          )}>
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm, remarkMath]}
                              rehypePlugins={[rehypeKatex]}
                            >
                              {msg.result.text
                                .replace(/\\\[/g, () => '\n$$\n')
                                .replace(/\\\]/g, () => '\n$$\n')
                                .replace(/\\\(/g, () => '$')
                                .replace(/\\\)/g, () => '$')}
                            </ReactMarkdown>
                          </div>
                        )}
                        {resultMedia.length > 0 && (
                          <div className="flex flex-wrap gap-3">
                            {resultMedia.map((m, i) => {
                              const mediaType =
                                m.type?.toLowerCase().includes('video')
                                  ? 'video'
                                  : m.type?.toLowerCase().includes('audio')
                                    ? 'audio'
                                    : 'image';

                              return (
                                <div
                                  key={i}
                                  className={cn(
                                    'relative group w-full max-w-[320px] rounded-[26px] overflow-hidden',
                                    glass.card
                                  )}
                                >
                                  {mediaType === 'audio' ? (
                                    <div className="p-4 flex flex-col gap-3">
                                      <AudioPlayer src={m.url} />

                                      <button
                                        onClick={() => handleDownload(m.url)}
                                        className={cn(
                                          'self-end p-2.5 rounded-[14px] transition active:scale-90',
                                          glass.thin
                                        )}
                                      >
                                        <Download size={16} className="text-cyan-300" />
                                      </button>
                                    </div>
                                  ) : (
                                    <>
                                      <div
                                        className="relative aspect-square  cursor-pointer overflow-hidden"
                                        onClick={() => setViewerSrc(m)}
                                      >
                                        {mediaType === 'image' ? (
                                          <img
                                            src={m.url}
                                            className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105"
                                            alt=""
                                          />
                                        ) : (
                                          <video
                                            src={m.url}
                                            className="w-full h-full object-cover"
                                            muted
                                            loop
                                            playsInline
                                            onMouseEnter={(e) => e.currentTarget.play()}
                                            onMouseLeave={(e) => e.currentTarget.pause()}
                                          />
                                        )}

                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownload(m.url);
                                          }}
                                          className="absolute top-3 right-3 p-2 rounded-full bg-black/55 backdrop-blur border border-white/20"
                                        >
                                          <Download size={14} className="text-white" />
                                        </button>

                                        {mediaType === 'video' && (
                                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:opacity-0 transition-opacity">
                                            <div
                                              className={cn(
                                                'w-12 h-12 rounded-full flex items-center justify-center',
                                                glass.thin
                                              )}
                                            >
                                              <Play
                                                size={20}
                                                fill="white"
                                                className="ml-1 text-white"
                                              />
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {(msg.post_id === null ||
                                        msg.post_id === undefined ||
                                        msg.post_id === 0) && (
                                          <div className="p-3">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setPublishingMessage(msg);
                                              }}
                                              className={cn(
                                                'w-full flex items-center justify-center gap-2 py-3 rounded-[18px]',
                                                'text-[13px] font-black text-cyan-200 transition active:scale-95',
                                                glass.cyan
                                              )}
                                            >
                                              <Share2 size={14} />
                                              {t('publishToTrends') || 'Publish to Trends'}
                                            </button>
                                          </div>
                                        )}
                                    </>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* ── Media Viewer ── */}
      {viewerSrc && (
        <div
          onClick={() => setViewerSrc(null)}
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-4xl h-full flex flex-col items-center justify-center gap-6">
            {viewerSrc.type === 'image' ? (
              <img src={viewerSrc.url} className="max-w-full max-h-[75vh] object-contain rounded-[26px]" alt="" />
            ) : (
              <video src={viewerSrc.url} controls autoPlay className="max-w-full max-h-[75vh] rounded-[26px]" />
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setViewerSrc(null)}
                className={cn('px-7 py-2.5 rounded-full text-[14px] font-bold transition active:scale-95', glass.thin)}
              >
                {t('close')}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDownload(viewerSrc.url); }}
                className={cn('px-7 py-2.5 rounded-full text-[14px] font-black text-cyan-200 transition active:scale-95', glass.cyan)}
              >
                {t('download')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Input Bar ── */}
      <div className="px-4 pt-3 pb-[calc(16px+max(12px,env(safe-area-inset-bottom)))] md:pb-4 md:mb-4 bg-white/[.03] backdrop-blur-3xl border-t border-white/[.07] rounded-none sm:rounded-full z-50">
        <div className="max-w-2xl mx-auto flex flex-col gap-2.5">
          {uploadedFiles.length > 0 && (
            <div className="flex gap-2 flex-wrap px-1">
              {uploadedFiles.map((f, i) => (
                <div key={i} className="relative w-14 h-14 rounded-[14px] overflow-hidden border border-white/[.12] group">
                  {f.type === 'image' ? (
                    <img src={f.url} className="size-full object-cover" alt="" />
                  ) : (
                    <div className="size-full flex items-center justify-center bg-white/[.07] text-xl">
                      {f.type === 'video' ? '🎬' : '🎵'}
                    </div>
                  )}
                  <button
                    onClick={() => removeFile(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center border border-white/20"
                  >
                    <X size={10} className="text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2.5">
            {canAttachMedia && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={upload.isPending}
                className={cn('w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition active:scale-90', glass.thin)}
              >
                {upload.isPending
                  ? <Loader2 size={18} className="animate-spin text-white/30" />
                  : <ImagePlus size={18} className="text-white/40" />}
              </button>
            )}
            <input type="file" ref={fileInputRef} accept="image/*,.heic,video/*,audio/*" onChange={handleFileUpload} className="hidden" />

            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isHistoryLoading ? t('loadingPlaceholder') : t('placeholder')}
              className={cn(
                'flex-1 resize-none outline-none px-4 py-3 rounded-2xl text-[16px] leading-tight',
                'text-white placeholder:text-white/25 max-h-32 min-h-[44px]',
                glass.thin,
                'focus:border-cyan-400/30',
                'transition-all duration-200'
              )}
              style={{ scrollbarWidth: 'none', fontSize: 16 }}
              rows={1}
            />

            <button
              onClick={handleSend}
              disabled={isSendDisabled}
              className={cn(
                'w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all active:scale-90',
                isSendDisabled
                  ? cn(glass.thin, 'opacity-35')
                  : glass.cyan
              )}
            >
              {generate.isPending
                ? <Loader2 size={18} className="animate-spin text-cyan-300" />
                : <Send size={18} className={isSendDisabled ? 'text-white/25' : 'text-cyan-200'} />}
            </button>
          </div>
        </div>
      </div>

      <style>{`.no-scrollbar::-webkit-scrollbar{display:none}`}</style>

      {publishingMessage && (
        <PublishDialog
          isOpen={!!publishingMessage}
          onClose={() => setPublishingMessage(null)}
          message={publishingMessage}
        />
      )}
    </div>
  );
}