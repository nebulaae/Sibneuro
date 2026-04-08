'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useChatHistory, useUpload } from '@/hooks/useApiExtras';
import {
  useGenerateAI,
  convertMediaToInputs,
  normalizeResultMedia,
} from '@/hooks/useGenerations';
import { useAIModels } from '@/hooks/useModels';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  ChevronLeft,
  Send,
  ImagePlus,
  Loader2,
  X,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';

/* ── Types ── */
interface MediaItem {
  type?: string;
  url?: string;
  input?: string;
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
  status: 'completed' | 'processing' | 'error';
  error?: string | null;
  cost?: number;
  created_at?: string;
}

function extractDisplayMedia(
  inputs: Message['inputs']
): Array<{ url: string; type: string }> {
  const r: Array<{ url: string; type: string }> = [];
  if (!inputs) return r;
  (inputs.image || []).forEach((url) => r.push({ url, type: 'image' }));
  (inputs.video || []).forEach((url) => r.push({ url, type: 'video' }));
  (inputs.audio || []).forEach((url) => r.push({ url, type: 'audio' }));
  (inputs.media || []).forEach((m) => {
    const url = m.url || m.input || '';
    if (url) r.push({ url, type: m.type || 'image' });
  });
  return r;
}
function extractResultMedia(result: Message['result']) {
  return result?.media ? normalizeResultMedia(result.media) : [];
}

/* ── Glass styles ── */
const glass = (
  level: 'ultra-thin' | 'thin' | 'regular' | 'thick' | 'chrome' = 'regular'
) =>
  ({
    'ultra-thin': {
      background: 'var(--glass-ultra-thin)',
      backdropFilter: 'var(--blur-chrome) var(--vibrancy)',
      WebkitBackdropFilter: 'var(--blur-chrome) var(--vibrancy)',
      border: 'var(--glass-border-thin)',
      boxShadow: 'var(--glass-specular)',
    },
    thin: {
      background: 'var(--glass-thin)',
      backdropFilter: 'var(--blur-thin) var(--vibrancy)',
      WebkitBackdropFilter: 'var(--blur-thin) var(--vibrancy)',
      border: 'var(--glass-border-thin)',
      boxShadow: 'var(--glass-specular), var(--glass-shadow-sm)',
    },
    regular: {
      background: 'var(--glass-regular)',
      backdropFilter: 'var(--blur-regular) var(--vibrancy)',
      WebkitBackdropFilter: 'var(--blur-regular) var(--vibrancy)',
      border: 'var(--glass-border-regular)',
      boxShadow: 'var(--glass-specular), var(--glass-shadow-md)',
    },
    thick: {
      background: 'var(--glass-thick)',
      backdropFilter: 'var(--blur-thick) var(--vibrancy)',
      WebkitBackdropFilter: 'var(--blur-thick) var(--vibrancy)',
      border: 'var(--glass-border-thick)',
      boxShadow: 'var(--glass-specular), var(--glass-shadow-lg)',
    },
    chrome: {
      background: 'var(--glass-chrome)',
      backdropFilter: 'var(--blur-chrome) var(--vibrancy)',
      WebkitBackdropFilter: 'var(--blur-chrome) var(--vibrancy)',
      border: 'var(--glass-border-thick)',
      boxShadow: 'var(--glass-specular), var(--glass-shadow-md)',
    },
  })[level] as React.CSSProperties;

const springTransition = 'all 0.28s cubic-bezier(0.32, 0.72, 0, 1)';

export default function ChatPage({
  params,
}: {
  params: { dialogueId: string };
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<
    { url: string; type: string; file: File }[]
  >([]);
  const [viewerSrc, setViewerSrc] = useState<{
    url: string;
    type: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: messages, isLoading } = useChatHistory(params.dialogueId);
  const { data: allModels } = useAIModels();
  const generate = useGenerateAI();
  const upload = useUpload();

  const msgs = (messages as Message[]) || [];
  const isProcessing = msgs.some((m) => m.status === 'processing');

  const firstMsg = msgs[0];
  const currentModel = allModels?.find((m) => m.tech_name === firstMsg?.model);
  const currentVersion = currentModel?.versions?.find(
    (v) => v.label === firstMsg?.version
  );
  const limitMedia = currentVersion?.limit_media ?? null;
  const canAttachMedia =
    currentModel?.input?.some((t) => ['image', 'video', 'audio'].includes(t)) ??
    true;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [text]);

  const prevProcessingRef = useRef(false);
  useEffect(() => {
    if (prevProcessingRef.current && !isProcessing && msgs.length > 0)
      queryClient.invalidateQueries({ queryKey: queryKeys.user });
    prevProcessingRef.current = isProcessing;
  }, [isProcessing, msgs.length, queryClient]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const file = files[0];
    const fileType = file.type.startsWith('image/')
      ? 'image'
      : file.type.startsWith('video/')
        ? 'video'
        : 'audio';
    if (limitMedia !== null) {
      const limit = limitMedia[fileType] ?? 0;
      const currentCount = uploadedFiles.filter(
        (f) => f.type === fileType
      ).length;
      if (limit === 0) {
        toast.error(`Модель не принимает ${fileType}`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      if (currentCount >= limit) {
        toast.error(`Максимум ${limit} файл(ов) типа ${fileType}`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }
    try {
      const res = await upload.mutateAsync(file);
      setUploadedFiles((prev) => [
        ...prev,
        { url: res.url, type: res.type, file },
      ]);
    } catch {
      toast.error('Ошибка загрузки файла');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (i: number) =>
    setUploadedFiles((prev) => prev.filter((_, idx) => idx !== i));

  const handleSend = () => {
    if (isProcessing) {
      toast('Дождитесь окончания генерации');
      return;
    }
    if (!text.trim() && uploadedFiles.length === 0) return;
    if (!firstMsg?.model) {
      toast.error('Не удалось определить модель диалога');
      return;
    }
    const oldFormatMedia = uploadedFiles.map((f) => ({
      type: f.type,
      format: 'url',
      input: f.url,
    }));
    const safeText = text.trim() || 'Опиши изображение';
    const inputs = convertMediaToInputs(safeText, oldFormatMedia);
    generate.mutate(
      {
        tech_name: firstMsg.model,
        version: firstMsg.version || undefined,
        dialogue_id: params.dialogueId,
        role_id: firstMsg.role_id ?? null,
        inputs,
      },
      {
        onSuccess: () => {
          setText('');
          setUploadedFiles([]);
          queryClient.invalidateQueries({
            queryKey: queryKeys.chatHistory(params.dialogueId),
          });
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const chatTitle = firstMsg?.version || firstMsg?.model || 'Диалог';

  const acceptTypes = (() => {
    if (!currentModel) return 'image/*,.heic,video/*,audio/*';
    const a: string[] = [];
    if (currentModel.input?.includes('image')) a.push('image/*,.heic');
    if (currentModel.input?.includes('video')) a.push('video/*');
    if (currentModel.input?.includes('audio')) a.push('audio/*');
    return a.join(',') || 'image/*,.heic,video/*,audio/*';
  })();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100svh',
        background: 'var(--page-bg)',
      }}
    >
      {/* ── Header ── */}
      <header
        style={{
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          ...glass('ultra-thin'),
          borderRadius: 0,
          boxShadow: 'var(--glass-specular), 0 1px 0 var(--sys-separator)',
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 34,
            height: 34,
            borderRadius: '9999px',
            ...glass('thin'),
            cursor: 'pointer',
            transition: springTransition,
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.88)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <ChevronLeft size={18} style={{ color: 'var(--tint-blue)' }} />
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: '-0.2px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {chatTitle}
          </p>
          {isProcessing && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                marginTop: 1,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '9999px',
                  background: '#FF9500',
                  display: 'inline-block',
                  animation: 'pulse-opacity 1s infinite',
                }}
              />
              <span style={{ fontSize: 11, color: '#FF9500', fontWeight: 500 }}>
                Генерация...
              </span>
            </div>
          )}
        </div>
      </header>

      {/* ── Messages ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {isLoading ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              paddingTop: 32,
            }}
          >
            <div className="spinner" />
          </div>
        ) : msgs.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              gap: 12,
              textAlign: 'center',
              padding: '64px 0',
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                ...glass('regular'),
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p
              style={{
                fontSize: 14,
                color: 'var(--sys-label-secondary)',
                maxWidth: 240,
                lineHeight: 1.5,
              }}
            >
              Начните диалог — напишите что-нибудь
            </p>
          </div>
        ) : (
          msgs.map((msg, idx) => {
            const userMedia = extractDisplayMedia(msg.inputs);
            const resultMedia = extractResultMedia(msg.result);
            return (
              <div
                key={msg.id || idx}
                style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
              >
                {/* User bubble */}
                {(msg.inputs?.text || userMedia.length > 0) && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div
                      style={{
                        background: 'rgba(0, 122, 255, 0.85)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        border: '1px solid rgba(0,122,255,0.3)',
                        boxShadow:
                          'inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 16px rgba(0,122,255,0.25)',
                        color: '#fff',
                        borderRadius: '20px 20px 4px 20px',
                        padding: '10px 14px',
                        maxWidth: '78%',
                        fontSize: 15,
                        lineHeight: 1.45,
                      }}
                    >
                      {msg.inputs?.text && (
                        <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                          {msg.inputs.text}
                        </p>
                      )}
                      {userMedia.length > 0 && (
                        <div
                          style={{
                            marginTop: 8,
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 6,
                          }}
                        >
                          {userMedia.map((m, i) => (
                            <button
                              key={i}
                              onClick={() => setViewerSrc(m)}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                              }}
                            >
                              {m.type === 'image' ? (
                                <img
                                  src={m.url}
                                  alt=""
                                  style={{
                                    maxHeight: 140,
                                    borderRadius: 10,
                                    objectFit: 'cover',
                                  }}
                                />
                              ) : m.type === 'video' ? (
                                <video
                                  src={m.url}
                                  style={{ maxHeight: 140, borderRadius: 10 }}
                                />
                              ) : (
                                <div
                                  style={{
                                    padding: '6px 10px',
                                    background: 'rgba(255,255,255,0.15)',
                                    borderRadius: 8,
                                    fontSize: 12,
                                  }}
                                >
                                  🎵 Аудио
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* AI bubble */}
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ maxWidth: '82%' }}>
                    {msg.status === 'processing' ? (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '10px 14px',
                          borderRadius: '20px 20px 20px 4px',
                          ...glass('regular'),
                        }}
                      >
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '9999px',
                              background: 'var(--sys-label-secondary)',
                              animation: 'pulse-dot 1.2s infinite ease-in-out',
                              animationDelay: `${i * 0.15}s`,
                            }}
                          />
                        ))}
                      </div>
                    ) : msg.status === 'error' ? (
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: '20px 20px 20px 4px',
                          background: 'rgba(255,59,48,0.12)',
                          border: '1px solid rgba(255,59,48,0.25)',
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
                          backdropFilter: 'blur(20px)',
                          WebkitBackdropFilter: 'blur(20px)',
                          fontSize: 15,
                          color: '#FF3B30',
                        }}
                      >
                        {msg.error || 'Ошибка генерации'}
                      </div>
                    ) : (
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                        }}
                      >
                        {msg.result?.text && (
                          <div
                            style={{
                              padding: '10px 14px',
                              borderRadius: '20px 20px 20px 4px',
                              ...glass('regular'),
                              fontSize: 15,
                              lineHeight: 1.5,
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            {msg.result.text}
                          </div>
                        )}
                        {resultMedia.length > 0 && (
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: 8,
                            }}
                          >
                            {resultMedia.map((m, i) => (
                              <div key={i} style={{ position: 'relative' }}>
                                {m.type === 'image' ? (
                                  <img
                                    src={m.url}
                                    alt="Generated"
                                    style={{
                                      maxWidth: 260,
                                      maxHeight: 260,
                                      borderRadius: 'var(--radius-lg)',
                                      objectFit: 'cover',
                                      cursor: 'pointer',
                                      border: 'var(--glass-border-regular)',
                                      boxShadow: 'var(--glass-shadow-md)',
                                    }}
                                    onClick={() => setViewerSrc(m)}
                                  />
                                ) : m.type === 'video' ? (
                                  <video
                                    src={m.url}
                                    controls
                                    style={{
                                      maxWidth: 260,
                                      maxHeight: 260,
                                      borderRadius: 'var(--radius-lg)',
                                    }}
                                  />
                                ) : (
                                  <audio
                                    src={m.url}
                                    controls
                                    style={{ borderRadius: 'var(--radius-sm)' }}
                                  />
                                )}
                                <a
                                  href={m.url}
                                  download
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    position: 'absolute',
                                    top: 8,
                                    right: 8,
                                    background: 'rgba(0,0,0,0.45)',
                                    backdropFilter: 'blur(10px)',
                                    WebkitBackdropFilter: 'blur(10px)',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    borderRadius: '9999px',
                                    padding: 6,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    textDecoration: 'none',
                                    color: '#fff',
                                    opacity: 0,
                                    transition: 'opacity 0.2s',
                                  }}
                                  onMouseEnter={(e) =>
                                    (e.currentTarget.style.opacity = '1')
                                  }
                                  onMouseLeave={(e) =>
                                    (e.currentTarget.style.opacity = '0')
                                  }
                                >
                                  <Download size={14} />
                                </a>
                              </div>
                            ))}
                          </div>
                        )}
                        {!msg.result?.text && resultMedia.length === 0 && (
                          <div
                            style={{
                              padding: '10px 14px',
                              borderRadius: '20px 20px 20px 4px',
                              ...glass('thin'),
                              fontSize: 14,
                              color: 'var(--sys-label-secondary)',
                              fontStyle: 'italic',
                            }}
                          >
                            Ответ получен
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
        <div ref={messagesEndRef} />
      </div>

      {/* ── Media Viewer ── */}
      {viewerSrc && (
        <div
          onClick={() => setViewerSrc(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            background: 'rgba(0,0,0,0.88)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          {viewerSrc.type === 'image' ? (
            <img
              src={viewerSrc.url}
              alt=""
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                borderRadius: 'var(--radius-xl)',
                boxShadow: 'var(--glass-shadow-xl)',
              }}
            />
          ) : viewerSrc.type === 'video' ? (
            <video
              src={viewerSrc.url}
              controls
              autoPlay
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                borderRadius: 'var(--radius-xl)',
              }}
            />
          ) : null}
          <button
            onClick={() => setViewerSrc(null)}
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '9999px',
              padding: 8,
              cursor: 'pointer',
              color: '#fff',
              display: 'flex',
            }}
          >
            <X size={18} />
          </button>
          <a
            href={viewerSrc.url}
            download
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              bottom: 28,
              right: 20,
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '9999px',
              padding: 10,
              display: 'flex',
              color: '#fff',
              textDecoration: 'none',
            }}
          >
            <Download size={18} />
          </a>
        </div>
      )}

      {/* ── Input Bar ── */}
      <div
        style={{
          flexShrink: 0,
          ...glass('ultra-thin'),
          borderRadius: 0,
          borderTop: 'var(--glass-border-thin)',
          borderLeft: 'none',
          borderRight: 'none',
          borderBottom: 'none',
          padding: '10px 14px',
          paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
        }}
      >
        {/* File previews */}
        {uploadedFiles.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 8,
              flexWrap: 'wrap',
            }}
          >
            {uploadedFiles.map((f, i) => (
              <div
                key={i}
                style={{
                  position: 'relative',
                  width: 60,
                  height: 60,
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  border: 'var(--glass-border-regular)',
                  boxShadow: 'var(--glass-shadow-sm)',
                }}
              >
                {f.type === 'image' ? (
                  <img
                    src={f.url}
                    alt=""
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background: 'var(--glass-regular)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 22,
                    }}
                  >
                    {f.type === 'video' ? '🎬' : '🎵'}
                  </div>
                )}
                <button
                  onClick={() => removeFile(i)}
                  style={{
                    position: 'absolute',
                    top: 3,
                    right: 3,
                    background: 'rgba(0,0,0,0.55)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: 'none',
                    borderRadius: '9999px',
                    width: 18,
                    height: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#fff',
                    padding: 0,
                  }}
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          {/* Attach button */}
          {canAttachMedia && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={upload.isPending}
                style={{
                  flexShrink: 0,
                  width: 38,
                  height: 38,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '9999px',
                  ...glass('regular'),
                  cursor: 'pointer',
                  transition: springTransition,
                  opacity: upload.isPending ? 0.5 : 1,
                  ...{
                    background: 'var(--glass-regular)',
                    backdropFilter: 'var(--blur-regular)',
                    WebkitBackdropFilter: 'var(--blur-regular)',
                    border: 'var(--glass-border-regular)',
                    boxShadow: 'var(--glass-specular), var(--glass-shadow-sm)',
                  },
                }}
              >
                {upload.isPending ? (
                  <Loader2
                    size={16}
                    style={{
                      animation: 'spin 0.65s linear infinite',
                      color: 'var(--sys-label-secondary)',
                    }}
                  />
                ) : (
                  <ImagePlus
                    size={16}
                    style={{ color: 'var(--sys-label-secondary)' }}
                  />
                )}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                accept={acceptTypes}
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
            </>
          )}

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Напишите сообщение..."
            rows={1}
            style={{
              flex: 1,
              resize: 'none',
              outline: 'none',
              padding: '10px 14px',
              fontSize: 15,
              lineHeight: 1.45,
              borderRadius: 'var(--radius-lg)',
              background: 'var(--glass-thin)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: 'var(--glass-border-thin)',
              boxShadow: 'var(--glass-specular)',
              color: 'var(--sys-label)',
              maxHeight: 120,
              overflowY: 'auto',
              transition: 'all 0.22s cubic-bezier(0.32,0.72,0,1)',
              fontFamily: 'var(--font-sf)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.background = 'var(--glass-regular)';
              e.currentTarget.style.border = '1px solid rgba(0,122,255,0.4)';
              e.currentTarget.style.boxShadow =
                'var(--glass-specular), 0 0 0 3px rgba(0,122,255,0.12)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.background = 'var(--glass-thin)';
              e.currentTarget.style.border = 'var(--glass-border-thin)';
              e.currentTarget.style.boxShadow = 'var(--glass-specular)';
            }}
          />

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={
              isProcessing ||
              generate.isPending ||
              (!text.trim() && uploadedFiles.length === 0)
            }
            style={{
              flexShrink: 0,
              width: 38,
              height: 38,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '9999px',
              background: 'rgba(0,122,255,0.85)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(0,122,255,0.3)',
              boxShadow:
                'inset 0 1px 0 rgba(255,255,255,0.35), 0 4px 16px rgba(0,122,255,0.35)',
              cursor: 'pointer',
              transition: springTransition,
              opacity:
                isProcessing ||
                generate.isPending ||
                (!text.trim() && uploadedFiles.length === 0)
                  ? 0.4
                  : 1,
              color: '#fff',
            }}
            onMouseDown={(e) =>
              !e.currentTarget.disabled &&
              (e.currentTarget.style.transform = 'scale(0.88)')
            }
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {generate.isPending ? (
              <Loader2
                size={16}
                style={{ animation: 'apple-spin 0.65s linear infinite' }}
              />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
      </div>

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes apple-spin { to { transform: rotate(360deg); } }
        @keyframes pulse-dot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes pulse-opacity {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        textarea::placeholder { color: var(--sys-label-tertiary); }
      `}</style>
    </div>
  );
}
