'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  ChevronRight,
  BookOpen,
  Search,
  ImageIcon,
  Film,
  Music,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  useSavedPrompts,
  SavedPrompt,
  SavedPromptMedia,
} from '@/hooks/useSavedPrompts';

interface PromptsManagerDialogProps {
  open: boolean;
  onClose: () => void;
  /** Вставить промпт в чат — вызывается при нажатии на промпт */
  onInsert: (text: string, media?: SavedPromptMedia[]) => void;
}

type ViewState = 'list' | 'create' | 'edit';

function MediaThumb({ media }: { media: SavedPromptMedia }) {
  if (media.type === 'image') {
    return (
      <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-white/10 shrink-0">
        <img src={media.url} className="w-full h-full object-cover" alt="" />
      </div>
    );
  }
  return (
    <div className="w-12 h-12 rounded-xl border border-white/10 bg-zinc-800 flex items-center justify-center shrink-0">
      {media.type === 'video' ? (
        <Film size={18} className="text-white/40" />
      ) : (
        <Music size={18} className="text-white/40" />
      )}
    </div>
  );
}

export function PromptsManagerDialog({
  open,
  onClose,
  onInsert,
}: PromptsManagerDialogProps) {
  const { prompts, addPrompt, updatePrompt, deletePrompt } = useSavedPrompts();

  const [view, setView] = useState<ViewState>('list');
  const [editingPrompt, setEditingPrompt] = useState<SavedPrompt | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formText, setFormText] = useState('');
  const [formMedia, setFormMedia] = useState<SavedPromptMedia[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const titleRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // сброс при открытии
  useEffect(() => {
    if (open) {
      setView('list');
      setSearchQuery('');
      setEditingPrompt(null);
    }
  }, [open]);

  // фокус на поле заголовка при переходе в форму
  useEffect(() => {
    if (view === 'create' || view === 'edit') {
      setTimeout(() => titleRef.current?.focus(), 120);
    }
  }, [view]);

  const openCreate = () => {
    setFormTitle('');
    setFormText('');
    setFormMedia([]);
    setEditingPrompt(null);
    setView('create');
  };

  const openEdit = (p: SavedPrompt) => {
    setFormTitle(p.title);
    setFormText(p.text);
    setFormMedia(p.media ?? []);
    setEditingPrompt(p);
    setView('edit');
  };

  const handleSave = () => {
    if (!formTitle.trim() || !formText.trim()) return;
    if (view === 'edit' && editingPrompt) {
      updatePrompt(editingPrompt.id, formTitle, formText, formMedia);
    } else {
      addPrompt(formTitle, formText, formMedia);
    }
    setView('list');
  };

  const handleInsert = (p: SavedPrompt) => {
    onInsert(p.text, p.media);
    onClose();
  };

  const handleDelete = (id: string) => {
    if (deletingId === id) {
      deletePrompt(id);
      setDeletingId(null);
    } else {
      setDeletingId(id);
      // авто-сброс через 3 сек
      setTimeout(() => setDeletingId((cur) => (cur === id ? null : cur)), 3000);
    }
  };

  const removeFormMedia = (i: number) =>
    setFormMedia((prev) => prev.filter((_, idx) => idx !== i));

  const filtered = prompts.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isFormValid = formTitle.trim().length > 0 && formText.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-zinc-950/95 border-white/10 text-white max-w-md p-0 rounded-[32px] backdrop-blur-2xl shadow-2xl overflow-hidden">
        <DialogDescription className="hidden" />

        {/* ── Header ── */}
        <DialogHeader className="px-6 pt-6 pb-0">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-2xl bg-cyan-400/20 border border-cyan-400/30 flex items-center justify-center shrink-0">
              <BookOpen size={18} className="text-cyan-400" />
            </div>

            <DialogTitle className="text-[18px] font-black tracking-tight text-white">
              {view === 'list'
                ? 'Мои промпты'
                : view === 'create'
                  ? 'Новый промпт'
                  : 'Редактировать'}
            </DialogTitle>

            {view !== 'list' && (
              <button
                onClick={() => setView('list')}
                className="ml-auto w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </DialogHeader>

        <AnimatePresence mode="wait" initial={false}>
          {/* ── LIST VIEW ── */}
          {view === 'list' && (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col"
            >
              {/* Search + Add */}
              <div className="px-6 pt-4 pb-3 flex gap-2">
                <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/8 rounded-2xl px-3.5 h-10">
                  <Search size={15} className="text-white/30 shrink-0" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск промптов..."
                    className="flex-1 bg-transparent text-[14px] text-white placeholder:text-white/25 outline-none"
                  />
                </div>
                <button
                  onClick={openCreate}
                  className="w-10 h-10 rounded-2xl bg-cyan-400 flex items-center justify-center shadow-[0_0_16px_rgba(0,122,255,0.4)] transition-all active:scale-90 shrink-0"
                >
                  <Plus size={20} className="text-white" />
                </button>
              </div>

              {/* List */}
              <div className="px-3 pb-5 flex flex-col gap-1.5 max-h-[420px] overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4 text-center px-6">
                    <div className="w-16 h-16 rounded-[28px] bg-white/5 border border-white/8 flex items-center justify-center">
                      <Sparkles size={28} className="text-white/20" />
                    </div>
                    <p className="text-[14px] font-medium text-white/30 leading-relaxed max-w-[200px]">
                      {searchQuery
                        ? 'Ничего не найдено'
                        : 'Нет сохранённых промптов.\nНажми + чтобы создать первый'}
                    </p>
                  </div>
                ) : (
                  filtered.map((p) => (
                    <motion.div
                      key={p.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="group flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-white/4 hover:bg-white/7 border border-white/5 hover:border-white/10 transition-all cursor-pointer"
                      onClick={() => handleInsert(p)}
                    >
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold text-white leading-tight truncate">
                          {p.title}
                        </p>
                        <p className="text-[12px] text-white/35 mt-1 line-clamp-2 leading-relaxed">
                          {p.text}
                        </p>

                        {/* Media thumbs */}
                        {p.media && p.media.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            {p.media.slice(0, 4).map((m, i) => (
                              <MediaThumb key={i} media={m} />
                            ))}
                            {p.media.length > 4 && (
                              <span className="text-[11px] font-bold text-white/30">
                                +{p.media.length - 4}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div
                        className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => openEdit(p)}
                          className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-90"
                        >
                          <Pencil size={13} />
                        </button>

                        <button
                          onClick={() => handleDelete(p.id)}
                          className={cn(
                            'w-8 h-8 rounded-xl border flex items-center justify-center transition-all active:scale-90',
                            deletingId === p.id
                              ? 'bg-red-500/20 border-red-500/40 text-red-400'
                              : 'bg-white/5 border-white/10 text-white/40 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20'
                          )}
                          title={
                            deletingId === p.id
                              ? 'Нажми ещё раз для удаления'
                              : 'Удалить'
                          }
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {/* Insert arrow */}
                      <ChevronRight
                        size={16}
                        className="text-cyan-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5"
                      />
                    </motion.div>
                  ))
                )}
              </div>

              {prompts.length > 0 && (
                <div className="px-6 pb-5">
                  <p className="text-[11px] text-white/20 text-center font-medium uppercase tracking-widest">
                    {prompts.length} промпт
                    {prompts.length === 1
                      ? ''
                      : prompts.length < 5
                        ? 'а'
                        : 'ов'}{' '}
                    сохранено
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* ── CREATE / EDIT FORM ── */}
          {(view === 'create' || view === 'edit') && (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col px-6 pt-4 pb-6 gap-4"
            >
              {/* Title field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black text-white/30 uppercase tracking-[0.12em] px-1">
                  Название
                </label>
                <input
                  ref={titleRef}
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Напр: Фотосессия подруг"
                  className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-[15px] text-white placeholder:text-white/20 outline-none focus:border-cyan-400/40 transition-colors"
                  maxLength={60}
                />
              </div>

              {/* Text field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black text-white/30 uppercase tracking-[0.12em] px-1">
                  Текст промпта
                </label>
                <textarea
                  ref={textRef}
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  placeholder="Введи свой промпт целиком..."
                  className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-[15px] text-white placeholder:text-white/20 outline-none focus:border-cyan-400/40 transition-colors resize-none min-h-[120px] max-h-[220px]"
                  rows={5}
                />
                <p className="text-[11px] text-white/20 text-right px-1">
                  {formText.length} симв.
                </p>
              </div>

              {/* Media list */}
              {formMedia.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-black text-white/30 uppercase tracking-[0.12em] px-1 flex items-center gap-1.5">
                    <ImageIcon size={11} /> Медиа ({formMedia.length})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {formMedia.map((m, i) => (
                      <div key={i} className="relative group">
                        <MediaThumb media={m} />
                        <button
                          onClick={() => removeFormMedia(i)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 mt-1">
                <button
                  onClick={() => setView('list')}
                  className="flex-1 h-12 rounded-2xl bg-white/5 border border-white/8 text-[15px] font-bold text-white/50 transition-all active:scale-95"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSave}
                  disabled={!isFormValid}
                  className={cn(
                    'flex-1 h-12 rounded-2xl text-[15px] font-black flex items-center justify-center gap-2 transition-all active:scale-95',
                    isFormValid
                      ? 'bg-cyan-400 text-white shadow-[0_0_20px_rgba(0,122,255,0.35)]'
                      : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                  )}
                >
                  <Check size={18} />
                  {view === 'edit' ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
