'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAIModels, useModelParams } from '@/hooks/useModels';
import { convertMediaToInputs, useGenerateAI } from '@/hooks/useGenerations';
import { useUpload } from '@/hooks/useApiExtras';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Loader2,
  ChevronLeft,
  ImagePlus,
  X,
  CheckCircle,
  AlertCircle,
  Settings2,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

/* ─── Polling hook ─── */
function useGenerationStatus(dialogueId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['gen-status', dialogueId],
    queryFn: async () => {
      const { data } = await api.get(`/api/chats/history`, {
        params: { dialogue_id: dialogueId },
      });
      const msgs = data.messages || data || [];
      return Array.isArray(msgs) ? msgs[msgs.length - 1] : null;
    },
    enabled: !!dialogueId && enabled,
    refetchInterval: 2000,
  });
}

/* ─── Spring / glass tokens ─── */
const spring = 'all 0.28s cubic-bezier(0.32, 0.72, 0, 1)';

const glassRegular: React.CSSProperties = {
  background: 'var(--glass-regular)',
  backdropFilter: 'var(--blur-regular) var(--vibrancy)',
  WebkitBackdropFilter: 'var(--blur-regular) var(--vibrancy)',
  border: 'var(--glass-border-regular)',
  boxShadow: 'var(--glass-specular), var(--glass-shadow-md)',
};

const glassThick: React.CSSProperties = {
  background: 'var(--glass-thick)',
  backdropFilter: 'var(--blur-thick) var(--vibrancy)',
  WebkitBackdropFilter: 'var(--blur-thick) var(--vibrancy)',
  border: 'var(--glass-border-thick)',
  boxShadow: 'var(--glass-specular), var(--glass-shadow-lg)',
};

const glassThin: React.CSSProperties = {
  background: 'var(--glass-thin)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: 'var(--glass-border-thin)',
  boxShadow: 'var(--glass-specular)',
};

/* ─── Section header ─── */
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p
    style={{
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.6px',
      textTransform: 'uppercase',
      color: 'var(--sys-label-secondary)',
      marginBottom: 10,
    }}
  >
    {children}
  </p>
);

/* ─── Pill button ─── */
const PillBtn = ({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    style={{
      padding: '6px 14px',
      borderRadius: 9999,
      fontSize: 13,
      fontWeight: 600,
      cursor: 'pointer',
      transition: spring,
      flexShrink: 0,
      ...(active
        ? {
            background: 'rgba(0,122,255,0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(0,122,255,0.3)',
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.35), 0 4px 14px rgba(0,122,255,0.35)',
            color: '#fff',
          }
        : {
            ...glassThin,
            color: 'var(--sys-label-secondary)',
          }),
    }}
    onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.92)')}
    onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
  >
    {children}
  </button>
);

/* ─── Model row ─── */
const ModelRow = ({ m, onClick }: { m: any; onClick: () => void }) => {
  const cost =
    m.versions?.find((v: any) => v.default)?.cost ?? m.versions?.[0]?.cost ?? 1;
  const avatarUrl =
    m.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(m.model_name)}&background=1c1c1c&color=fff&size=128`;

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '13px 20px',
        width: '100%',
        textAlign: 'left',
        background: 'transparent',
        border: 'none',
        borderBottom: '1px solid var(--sys-separator)',
        cursor: 'pointer',
        transition: spring,
        WebkitTapHighlightColor: 'transparent',
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = 'var(--glass-ultra-thin)')
      }
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.transform = 'scale(1)';
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'scale(0.985)';
        e.currentTarget.style.background = 'var(--glass-thin)';
      }}
      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: 14,
          overflow: 'hidden',
          flexShrink: 0,
          border: 'var(--glass-border-thin)',
          boxShadow: 'var(--glass-specular)',
        }}
      >
        <Avatar style={{ width: '100%', height: '100%' }}>
          <AvatarImage src={avatarUrl} />
          <AvatarFallback
            style={{
              fontSize: 12,
              fontWeight: 700,
              background: 'var(--glass-regular)',
              color: 'var(--sys-label)',
            }}
          >
            {m.model_name.slice(0, 2)}
          </AvatarFallback>
        </Avatar>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--sys-label)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            letterSpacing: '-0.2px',
          }}
        >
          {m.model_name}
        </p>
        <p
          style={{
            fontSize: 12,
            color: 'var(--sys-label-secondary)',
            marginTop: 2,
          }}
        >
          {m.versions?.length > 1
            ? `${m.versions.length} версии`
            : m.versions?.[0]?.label || ''}
        </p>
      </div>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 10px',
          borderRadius: 9999,
          fontSize: 12,
          fontWeight: 600,
          ...glassThin,
          color: 'var(--sys-label-secondary)',
          flexShrink: 0,
        }}
      >
        💎 {cost}
      </div>
    </button>
  );
};

/* ─── Main component ─── */
export const Generate = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modelParam = searchParams.get('model');
  const queryClient = useQueryClient();

  const [selectedTech, setSelectedTech] = useState<string | null>(modelParam);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [media, setMedia] = useState<
    { type: string; url: string; file?: File }[]
  >([]);
  const [extraParams, setExtraParams] = useState<Record<string, any>>({});
  const [showParams, setShowParams] = useState(false);
  const [pendingDialogueId, setPendingDialogueId] = useState<string | null>(
    null
  );
  const [isWaitingResult, setIsWaitingResult] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: allModels, isLoading } = useAIModels();
  const generate = useGenerateAI();
  const upload = useUpload();

  const models = (allModels || []).filter(
    (m) => !m.categories?.includes('text')
  );
  const selected = models.find((m) => m.tech_name === selectedTech);
  const currentVersion =
    selectedVersion ||
    selected?.versions?.find((v) => v.default)?.label ||
    selected?.versions?.[0]?.label;

  const { data: params } = useModelParams(selectedTech, currentVersion);
  const { data: lastMessage } = useGenerationStatus(
    pendingDialogueId,
    isWaitingResult
  );

  useEffect(() => {
    if (modelParam) setSelectedTech(modelParam);
  }, [modelParam]);

  useEffect(() => {
    if (selected) {
      const def =
        selected.versions?.find((v) => v.default) || selected.versions?.[0];
      setSelectedVersion(def?.label || null);
    }
  }, [selected?.tech_name]);

  useEffect(() => {
    if (!params) return;
    const defaults: Record<string, any> = {};
    params.forEach((p: any) => {
      if (p.default !== undefined) defaults[p.name] = p.default;
    });
    setExtraParams(defaults);
  }, [params]);

  useEffect(() => {
    if (!isWaitingResult || !lastMessage) return;
    if (lastMessage.status === 'completed') {
      setIsWaitingResult(false);
      toast.success('Генерация завершена!');
      if (pendingDialogueId) router.push(`/chats/${pendingDialogueId}`);
      setPendingDialogueId(null);
    } else if (lastMessage.status === 'error') {
      setIsWaitingResult(false);
      toast.error(
        'Ошибка генерации: ' + (lastMessage.error || 'Неизвестная ошибка')
      );
      setPendingDialogueId(null);
    }
  }, [lastMessage, isWaitingResult, pendingDialogueId, router]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const file = files[0];
    try {
      const uploaded = await upload.mutateAsync(file);
      setMedia((prev) => [
        ...prev,
        { type: uploaded.type, url: uploaded.url, file },
      ]);
    } catch {
      toast.error('Ошибка загрузки файла');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerate = () => {
    if (!selected) return;
    if (!prompt.trim() && media.length === 0) {
      toast.error('Введите описание или прикрепите файл');
      return;
    }
    const oldFormatMedia = media.map((m) => ({
      type: m.type,
      format: 'url',
      input: m.url,
    }));
    const inputs = convertMediaToInputs(prompt.trim() || ' ', oldFormatMedia);
    generate.mutate(
      {
        tech_name: selected.tech_name,
        version: currentVersion || undefined,
        inputs,
        params: Object.keys(extraParams).length > 0 ? extraParams : undefined,
      },
      {
        onSuccess: (data) => {
          const dialogueId = data.dialogue_id;
          if (data.status === 'processing') {
            toast('Генерация запущена, ждём результата...');
            setPendingDialogueId(dialogueId || null);
            setIsWaitingResult(!!dialogueId);
          } else if (dialogueId) {
            toast.success('Готово!');
            router.push(`/chats/${dialogueId}`);
          } else {
            toast.success('Генерация завершена');
          }
        },
      }
    );
  };

  /* ─── Waiting screen ─── */
  if (isWaitingResult && pendingDialogueId) {
    const status = lastMessage?.status;
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100svh',
          gap: 28,
          padding: '24px 20px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...glassThick,
          }}
        >
          {!status || status === 'processing' ? (
            <Loader2
              size={32}
              style={{
                animation: 'apple-spin 0.7s linear infinite',
                color: 'var(--sys-label-secondary)',
              }}
            />
          ) : status === 'completed' ? (
            <CheckCircle size={32} style={{ color: '#34C759' }} />
          ) : (
            <AlertCircle size={32} style={{ color: '#FF3B30' }} />
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.4px' }}>
            {!status || status === 'processing'
              ? 'Генерация...'
              : status === 'completed'
                ? 'Готово!'
                : 'Ошибка'}
          </p>
          <p
            style={{
              fontSize: 14,
              color: 'var(--sys-label-secondary)',
              maxWidth: 280,
              lineHeight: 1.5,
            }}
          >
            {!status || status === 'processing'
              ? 'Нейросеть обрабатывает запрос. Это может занять от нескольких секунд до минуты.'
              : 'Переход к результату...'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: 99,
                background: 'var(--sys-label-tertiary)',
                animation: 'pulse-dot 1.4s ease-in-out infinite',
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
        <button
          onClick={() => {
            setIsWaitingResult(false);
            setPendingDialogueId(null);
            router.push(`/chats/${pendingDialogueId}`);
          }}
          style={{
            fontSize: 13,
            color: 'var(--sys-label-secondary)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
        >
          Перейти в чат
        </button>
        <style>{`
          @keyframes apple-spin { to { transform: rotate(360deg); } }
          @keyframes pulse-dot { 0%,80%,100% { transform:scale(0.6);opacity:0.4; } 40% { transform:scale(1);opacity:1; } }
        `}</style>
      </div>
    );
  }

  /* ─── Detail view (model selected) ─── */
  if (selected) {
    const cost =
      selected.versions?.find((v) => v.label === currentVersion)?.cost ??
      selected.versions?.[0]?.cost ??
      1;
    const canAttach = selected.input?.some((t) =>
      ['image', 'video', 'audio'].includes(t)
    );
    const aspectParam = (params || []).find(
      (p: any) => p.name === 'aspect_ratio'
    );

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100svh',
          paddingBottom: 'calc(80px + max(16px, env(safe-area-inset-bottom)))',
          overflowX: 'hidden',
        }}
      >
        {/* Header */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 40,
            backdropFilter: 'var(--blur-chrome) var(--vibrancy)',
            WebkitBackdropFilter: 'var(--blur-chrome) var(--vibrancy)',
            background: 'var(--glass-ultra-thin)',
            borderBottom: 'var(--glass-border-thin)',
            boxShadow: 'var(--glass-specular)',
          }}
        >
          <div
            style={{
              maxWidth: 760,
              marginInline: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
            }}
          >
            <button
              onClick={() => {
                setSelectedTech(null);
                setPrompt('');
                setMedia([]);
                setExtraParams({});
                setShowParams(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 15,
                fontWeight: 500,
                color: 'var(--tint-blue)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 8,
                transition: spring,
              }}
              onMouseDown={(e) =>
                (e.currentTarget.style.transform = 'scale(0.92)')
              }
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = 'scale(1)')
              }
            >
              <ChevronLeft size={18} /> Назад
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 8,
                  overflow: 'hidden',
                  ...glassThin,
                }}
              >
                <Avatar style={{ width: '100%', height: '100%' }}>
                  <AvatarImage src={selected.avatar} />
                  <AvatarFallback style={{ fontSize: 9, fontWeight: 700 }}>
                    {selected.model_name.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  letterSpacing: '-0.2px',
                }}
              >
                {selected.model_name}
              </span>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 10px',
                borderRadius: 9999,
                fontSize: 12,
                fontWeight: 600,
                ...glassThin,
                color: 'var(--sys-label-secondary)',
              }}
            >
              💎 {cost}
            </div>
          </div>
        </header>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div
            style={{
              maxWidth: 760,
              marginInline: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
              padding: '20px 20px',
            }}
          >
            {/* Version selector */}
            {selected.versions && selected.versions.length > 1 && (
              <div>
                <SectionLabel>Версия</SectionLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {selected.versions.map((v) => (
                    <PillBtn
                      key={v.label}
                      active={currentVersion === v.label}
                      onClick={() => setSelectedVersion(v.label)}
                    >
                      {v.label}{' '}
                      <span style={{ opacity: 0.6 }}>· {v.cost}💎</span>
                    </PillBtn>
                  ))}
                </div>
              </div>
            )}

            {/* Prompt */}
            <div>
              <SectionLabel>Описание</SectionLabel>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Опишите, что хотите создать..."
                rows={4}
                style={{
                  width: '100%',
                  resize: 'none',
                  outline: 'none',
                  padding: '14px 16px',
                  fontSize: 15,
                  lineHeight: 1.55,
                  borderRadius: 'var(--radius-lg)',
                  ...glassRegular,
                  color: 'var(--sys-label)',
                  fontFamily: 'var(--font-sf)',
                  boxSizing: 'border-box',
                  transition: 'all 0.22s cubic-bezier(0.32,0.72,0,1)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.border =
                    '1px solid rgba(0,122,255,0.4)';
                  e.currentTarget.style.boxShadow =
                    'var(--glass-specular), 0 0 0 3px rgba(0,122,255,0.12)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.border = 'var(--glass-border-regular)';
                  e.currentTarget.style.boxShadow =
                    'var(--glass-specular), var(--glass-shadow-md)';
                }}
              />
            </div>

            {/* Aspect ratio */}
            {aspectParam && (
              <div>
                <SectionLabel>Соотношение сторон</SectionLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {aspectParam.values?.map((val: string) => (
                    <PillBtn
                      key={val}
                      active={
                        (extraParams.aspect_ratio ?? aspectParam.default) ===
                        val
                      }
                      onClick={() =>
                        setExtraParams((p) => ({ ...p, aspect_ratio: val }))
                      }
                    >
                      {val}
                    </PillBtn>
                  ))}
                </div>
              </div>
            )}

            {/* Advanced params */}
            {params &&
              params.filter((p: any) => p.name !== 'aspect_ratio').length >
                0 && (
                <div>
                  <button
                    onClick={() => setShowParams(!showParams)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 13,
                      color: 'var(--sys-label-secondary)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '6px 0',
                      transition: spring,
                    }}
                  >
                    <Settings2 size={14} />
                    Дополнительные параметры
                    <ChevronDown
                      size={14}
                      style={{
                        transform: showParams
                          ? 'rotate(180deg)'
                          : 'rotate(0deg)',
                        transition: spring,
                      }}
                    />
                  </button>
                  {showParams && (
                    <div
                      style={{
                        marginTop: 14,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 14,
                      }}
                    >
                      {params
                        .filter((p: any) => p.name !== 'aspect_ratio')
                        .map((p: any) => (
                          <div key={p.name}>
                            <label
                              style={{
                                fontSize: 12,
                                color: 'var(--sys-label-secondary)',
                                display: 'block',
                                marginBottom: 6,
                              }}
                            >
                              {p.label || p.name}
                            </label>
                            {p.type === 'select' && p.values ? (
                              <div
                                style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: 6,
                                }}
                              >
                                {p.values.map((val: string) => (
                                  <PillBtn
                                    key={val}
                                    active={
                                      (extraParams[p.name] ?? p.default) === val
                                    }
                                    onClick={() =>
                                      setExtraParams((prev) => ({
                                        ...prev,
                                        [p.name]: val,
                                      }))
                                    }
                                  >
                                    {val}
                                  </PillBtn>
                                ))}
                              </div>
                            ) : (
                              <input
                                type={p.type === 'number' ? 'number' : 'text'}
                                value={extraParams[p.name] ?? p.default ?? ''}
                                min={p.min}
                                max={p.max}
                                onChange={(e) =>
                                  setExtraParams((prev) => ({
                                    ...prev,
                                    [p.name]:
                                      p.type === 'number'
                                        ? Number(e.target.value)
                                        : e.target.value,
                                  }))
                                }
                                style={{
                                  width: '100%',
                                  boxSizing: 'border-box',
                                  padding: '10px 14px',
                                  borderRadius: 'var(--radius-md)',
                                  fontSize: 14,
                                  outline: 'none',
                                  ...glassThin,
                                  color: 'var(--sys-label)',
                                  fontFamily: 'var(--font-sf)',
                                }}
                              />
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

            {/* Media upload */}
            {canAttach && (
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 10,
                  }}
                >
                  <SectionLabel>Медиафайл</SectionLabel>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={upload.isPending}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--tint-blue)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      transition: spring,
                      opacity: upload.isPending ? 0.5 : 1,
                    }}
                  >
                    {upload.isPending ? (
                      <Loader2
                        size={13}
                        style={{
                          animation: 'apple-spin 0.65s linear infinite',
                        }}
                      />
                    ) : (
                      <ImagePlus size={13} />
                    )}
                    Прикрепить
                  </button>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*,.heic,video/*,audio/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                {media.length > 0 && (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {media.map((m, i) => (
                      <div
                        key={i}
                        style={{
                          position: 'relative',
                          width: 80,
                          height: 80,
                          borderRadius: 'var(--radius-lg)',
                          overflow: 'hidden',
                          border: 'var(--glass-border-thin)',
                          boxShadow: 'var(--glass-specular)',
                        }}
                      >
                        {m.type === 'image' ? (
                          <img
                            src={m.file ? URL.createObjectURL(m.file) : m.url}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                            alt=""
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = m.url;
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 28,
                              background: 'var(--glass-thin)',
                            }}
                          >
                            {m.type === 'video' ? '🎬' : '🎵'}
                          </div>
                        )}
                        <button
                          onClick={() =>
                            setMedia((prev) =>
                              prev.filter((_, idx) => idx !== i)
                            )
                          }
                          style={{
                            position: 'absolute',
                            top: 5,
                            right: 5,
                            width: 20,
                            height: 20,
                            background: 'rgba(0,0,0,0.55)',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                            border: 'none',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                          }}
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={
                (!prompt.trim() && media.length === 0) ||
                generate.isPending ||
                upload.isPending
              }
              style={{
                width: '100%',
                padding: '16px 24px',
                borderRadius: 'var(--radius-pill)',
                fontSize: 17,
                fontWeight: 700,
                background: 'rgba(0,122,255,0.85)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(0,122,255,0.3)',
                boxShadow:
                  'inset 0 1px 0 rgba(255,255,255,0.35), 0 6px 24px rgba(0,122,255,0.4)',
                color: '#fff',
                cursor: 'pointer',
                transition: spring,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity:
                  (!prompt.trim() && media.length === 0) ||
                  generate.isPending ||
                  upload.isPending
                    ? 0.45
                    : 1,
              }}
              onMouseDown={(e) =>
                !e.currentTarget.disabled &&
                (e.currentTarget.style.transform = 'scale(0.97)')
              }
              onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = 'scale(1)')
              }
            >
              {generate.isPending || upload.isPending ? (
                <>
                  <Loader2
                    size={18}
                    style={{ animation: 'apple-spin 0.65s linear infinite' }}
                  />
                  {upload.isPending ? 'Загрузка...' : 'Генерация...'}
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Создать
                </>
              )}
            </button>
          </div>
        </div>

        <style>{`@keyframes apple-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  /* ─── Model picker ─── */
  const catOrder = ['image', 'video', 'audio'] as const;
  const catLabel: Record<string, string> = {
    image: '🖼️ Изображения',
    video: '🎬 Видео',
    audio: '🎵 Аудио',
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100svh',
        paddingBottom: 'calc(80px + max(16px, env(safe-area-inset-bottom)))',
        overflowX: 'hidden',
      }}
    >
      {/* Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          backdropFilter: 'var(--blur-chrome) var(--vibrancy)',
          WebkitBackdropFilter: 'var(--blur-chrome) var(--vibrancy)',
          background: 'var(--glass-ultra-thin)',
          borderBottom: 'var(--glass-border-thin)',
          boxShadow: 'var(--glass-specular)',
          padding: '14px 20px',
        }}
      >
        <div style={{ maxWidth: 760, marginInline: 'auto' }}>
          <p style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px' }}>
            Создать
          </p>
          <p
            style={{
              fontSize: 13,
              color: 'var(--sys-label-secondary)',
              marginTop: 1,
            }}
          >
            Выберите нейросеть
          </p>
        </div>
      </header>

      <div style={{ flex: 1 }}>
        <div style={{ maxWidth: 760, marginInline: 'auto' }}>
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '13px 20px',
                    borderBottom: '1px solid var(--sys-separator)',
                  }}
                >
                  <div
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 14,
                      background: 'var(--glass-thin)',
                      animation: 'pulse-opacity 1.6s ease-in-out infinite',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        width: '40%',
                        height: 13,
                        borderRadius: 6,
                        background: 'var(--glass-thin)',
                        marginBottom: 6,
                        animation:
                          'pulse-opacity 1.6s 0.1s ease-in-out infinite',
                      }}
                    />
                    <div
                      style={{
                        width: '25%',
                        height: 10,
                        borderRadius: 6,
                        background: 'var(--glass-thin)',
                        animation:
                          'pulse-opacity 1.6s 0.2s ease-in-out infinite',
                      }}
                    />
                  </div>
                </div>
              ))
            : catOrder.map((cat) => {
                const catModels = models.filter(
                  (m) => m.mainCategory === cat || m.categories?.includes(cat)
                );
                if (!catModels.length) return null;
                return (
                  <div key={cat}>
                    {/* Category header */}
                    <div
                      style={{
                        padding: '10px 20px',
                        background: 'var(--glass-ultra-thin)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        borderBottom: '1px solid var(--sys-separator)',
                      }}
                    >
                      <p
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: '0.6px',
                          textTransform: 'uppercase',
                          color: 'var(--sys-label-secondary)',
                        }}
                      >
                        {catLabel[cat]}
                      </p>
                    </div>
                    {catModels.map((m) => (
                      <ModelRow
                        key={m.tech_name}
                        m={m}
                        onClick={() => setSelectedTech(m.tech_name)}
                      />
                    ))}
                  </div>
                );
              })}
        </div>
      </div>

      <style>{`
        @keyframes pulse-opacity { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes apple-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Generate;
