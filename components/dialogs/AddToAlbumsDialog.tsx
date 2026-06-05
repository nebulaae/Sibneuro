'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FolderPlus, Plus, Check, Loader2, FolderOpen, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useHaptic } from '@/hooks/useHaptic';
import {
  useAlbums,
  useCreateAlbum,
  useAddPostToAlbum,
  type Album,
} from '@/hooks/useAlbums';

const ALBUM_GRADIENTS = [
  'from-cyan-400 via-[#5856D6] to-[#AF52DE]',
  'from-[#FF2D55] via-[#FF6B35] to-[#FF9500]',
  'from-[#5AC8FA] via-[#34C759] to-[#30D158]',
  'from-[#5856D6] via-[#BF5AF2] to-[#FF375F]',
  'from-[#FF9F0A] via-[#FFD60A] to-[#30D158]',
  'from-[#0A84FF] via-[#32ADE6] to-[#5AC8FA]',
  'from-[#BF5AF2] via-[#5856D6] to-cyan-400',
  'from-[#FF6B6B] via-[#FF375F] to-[#BF5AF2]',
] as const;

interface AddToAlbumDialogProps {
  open: boolean;
  onClose: () => void;
  postId: number;
}

type ViewMode = 'list' | 'create';

export function AddToAlbumDialog({
  open,
  onClose,
  postId,
}: AddToAlbumDialogProps) {
  const haptic = useHaptic();
  const { data: albums = [], isLoading } = useAlbums();
  const addPost = useAddPostToAlbum();
  const createAlbum = useCreateAlbum();

  const [mode, setMode] = useState<ViewMode>('list');
  const [newName, setNewName] = useState('');
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [loadingId, setLoadingId] = useState<number | null>(null);

  const handleAdd = async (album: Album) => {
    if (addedIds.has(album.id) || loadingId !== null) return;
    haptic.medium();
    setLoadingId(album.id);
    try {
      await addPost.mutateAsync({ albumId: album.id, postId });
      setAddedIds((prev) => new Set([...prev, album.id]));
      haptic.success();
      toast.success(`Добавлено в «${album.name}»`);
    } catch (err: any) {
      if (err?.response?.status === 409) {
        toast.error('Уже есть в этом альбоме');
        setAddedIds((prev) => new Set([...prev, album.id]));
      } else {
        toast.error('Ошибка добавления');
      }
    } finally {
      setLoadingId(null);
    }
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    haptic.medium();
    try {
      const res = await createAlbum.mutateAsync({ name });
      // immediately add the post to the newly created album
      await addPost.mutateAsync({ albumId: res.id, postId });
      setAddedIds((prev) => new Set([...prev, res.id]));
      haptic.success();
      toast.success(`Создан альбом «${name}» и пост добавлен`);
      setNewName('');
      setMode('list');
    } catch (err: any) {
      if (err?.response?.status === 409) {
        toast.error('Альбом с таким именем уже существует');
      } else {
        toast.error('Ошибка создания альбома');
      }
    }
  };

  const handleClose = () => {
    setMode('list');
    setNewName('');
    setAddedIds(new Set());
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="bg-zinc-950/95 border-white/10 text-white max-w-md p-0 rounded-[32px] backdrop-blur-2xl shadow-2xl overflow-hidden">
        <DialogDescription className="hidden" />

        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-0 flex-row items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-cyan-400/20 border border-cyan-400/30 flex items-center justify-center shrink-0">
            <FolderPlus size={17} className="text-cyan-400" />
          </div>
          <DialogTitle className="text-[18px] font-black tracking-tight text-white flex-1">
            {mode === 'list' ? 'Добавить в альбом' : 'Новый альбом'}
          </DialogTitle>
          {mode === 'create' && (
            <button
              onClick={() => {
                setMode('list');
                setNewName('');
              }}
              className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
            >
              <X size={15} />
            </button>
          )}
        </DialogHeader>

        <AnimatePresence mode="wait" initial={false}>
          {mode === 'list' ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.16 }}
              className="flex flex-col px-3 pt-4 pb-5 gap-1.5 max-h-[420px] overflow-y-auto"
            >
              {/* Create new album button */}
              <button
                onClick={() => setMode('create')}
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-cyan-400/8 hover:bg-cyan-400/14 border border-cyan-400/20 transition-all active:scale-[0.98] group"
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-400/20 border border-cyan-400/25 flex items-center justify-center shrink-0">
                  <Plus size={18} className="text-cyan-400" />
                </div>
                <p className="text-[14px] font-black text-cyan-400">
                  Создать новый альбом
                </p>
              </button>

              {/* Divider */}
              {albums.length > 0 && (
                <div className="flex items-center gap-3 px-2 py-1">
                  <div className="flex-1 h-px bg-white/5" />
                  <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">
                    Мои альбомы
                  </span>
                  <div className="flex-1 h-px bg-white/5" />
                </div>
              )}

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-white/20" />
                </div>
              ) : albums.length === 0 ? (
                <div className="py-10 flex flex-col items-center gap-3 opacity-30">
                  <FolderOpen size={32} />
                  <p className="text-[12px] font-bold uppercase tracking-widest">
                    Нет альбомов
                  </p>
                </div>
              ) : (
                albums.map((album) => {
                  const isAdded = addedIds.has(album.id);
                  const isLoading = loadingId === album.id;
                  const gradient =
                    ALBUM_GRADIENTS[album.id % ALBUM_GRADIENTS.length];

                  return (
                    <button
                      key={album.id}
                      onClick={() => handleAdd(album)}
                      disabled={isAdded || isLoading}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all active:scale-[0.98]',
                        isAdded
                          ? 'bg-[#34C759]/8 border-[#34C759]/20 cursor-default'
                          : 'bg-white/3 hover:bg-white/6 border-white/5 hover:border-white/10'
                      )}
                    >
                      {/* Album thumb */}
                      <div
                        className={cn(
                          'w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br',
                          gradient
                        )}
                      >
                        {album.picture && (
                          <img
                            src={album.picture}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>

                      <p className="flex-1 text-[14px] font-bold text-white text-left truncate">
                        {album.name}
                      </p>

                      <div className="shrink-0">
                        {isLoading ? (
                          <Loader2
                            size={16}
                            className="animate-spin text-cyan-400"
                          />
                        ) : isAdded ? (
                          <div className="w-6 h-6 rounded-full bg-[#34C759] flex items-center justify-center">
                            <Check
                              size={13}
                              className="text-black"
                              strokeWidth={3}
                            />
                          </div>
                        ) : (
                          <Plus size={16} className="text-white/30" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </motion.div>
          ) : (
            <motion.div
              key="create"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.16 }}
              className="flex flex-col px-6 pt-4 pb-6 gap-4"
            >
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="Название альбома..."
                className="w-full px-4 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white text-[15px] font-bold placeholder:text-white/20 focus:outline-none focus:border-cyan-400/40 transition-colors"
                maxLength={64}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setMode('list');
                    setNewName('');
                  }}
                  className="flex-1 py-3.5 rounded-2xl bg-white/5 border border-white/8 text-white/50 text-[14px] font-black active:scale-95 transition-all"
                >
                  Отмена
                </button>
                <button
                  onClick={handleCreate}
                  disabled={
                    !newName.trim() ||
                    createAlbum.isPending ||
                    addPost.isPending
                  }
                  className="flex-1 py-3.5 rounded-2xl bg-cyan-400 text-white text-[14px] font-black active:scale-95 transition-all disabled:opacity-40 shadow-[0_0_20px_rgba(0,122,255,0.3)] flex items-center justify-center gap-2"
                >
                  {createAlbum.isPending || addPost.isPending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Plus size={16} />
                      Создать и добавить
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
