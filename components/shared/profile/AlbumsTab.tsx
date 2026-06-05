'use client';

import { useState } from 'react';
import {
  FolderOpen,
  Plus,
  Globe,
  Lock,
  Trash2,
  ChevronRight,
  ImageIcon,
  ArrowLeft,
  Copy,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { useHaptic } from '@/hooks/useHaptic';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  useAlbums,
  useAlbumPosts,
  useCreateAlbum,
  useDeleteAlbum,
  useToggleAlbumVisibility,
  type Album,
  type AlbumPost,
} from '@/hooks/useAlbums';

// ─── Gradient fallbacks (deterministic by album id) ──────────────────────────

const ALBUM_GRADIENTS = [
  // blue → violet
  'from-cyan-400 via-[#5856D6] to-[#AF52DE]',
  // rose → orange
  'from-[#FF2D55] via-[#FF6B35] to-[#FF9500]',
  // teal → emerald
  'from-[#5AC8FA] via-[#34C759] to-[#30D158]',
  // indigo → pink
  'from-[#5856D6] via-[#BF5AF2] to-[#FF375F]',
  // gold → amber
  'from-[#FF9F0A] via-[#FFD60A] to-[#30D158]',
  // deep blue → cyan
  'from-[#0A84FF] via-[#32ADE6] to-[#5AC8FA]',
  // plum → indigo
  'from-[#BF5AF2] via-[#5856D6] to-cyan-400',
  // coral → rose
  'from-[#FF6B6B] via-[#FF375F] to-[#BF5AF2]',
] as const;

// Decorative blob pattern SVG rendered inside the gradient
function GradientFallback({
  albumId,
  name,
}: {
  albumId: number;
  name: string;
}) {
  const gradient = ALBUM_GRADIENTS[albumId % ALBUM_GRADIENTS.length];
  const initial = name.charAt(0).toUpperCase();

  return (
    <div
      className={cn(
        'w-full h-full relative flex items-center justify-center bg-gradient-to-br',
        gradient
      )}
    >
      {/* Blurred blob top-right */}
      <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/20 blur-2xl" />
      {/* Blurred blob bottom-left */}
      <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-black/20 blur-3xl" />
      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg,transparent,transparent 18px,rgba(255,255,255,1) 18px,rgba(255,255,255,1) 19px),repeating-linear-gradient(90deg,transparent,transparent 18px,rgba(255,255,255,1) 18px,rgba(255,255,255,1) 19px)',
        }}
      />
      {/* Initial letter */}
      <span className="relative z-10 text-[44px] font-black text-white/80 leading-none drop-shadow-lg select-none">
        {initial}
      </span>
    </div>
  );
}

// ─── Album Card ───────────────────────────────────────────────────────────────

function AlbumCard({
  album,
  onClick,
  onDelete,
  onTogglePublic,
}: {
  album: Album;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onTogglePublic: (e: React.MouseEvent) => void;
}) {
  const t = useTranslations('Profile');

  return (
    <button
      onClick={onClick}
      className="w-full text-left group rounded-[28px] bg-zinc-900/50 border border-white/[0.07] hover:border-white/[0.14] hover:bg-zinc-900/70 active:scale-[0.98] transition-all duration-200 overflow-hidden shadow-lg shadow-black/20"
    >
      {/* Cover */}
      <div className="relative w-full aspect-[4/3] overflow-hidden">
        {album.picture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={album.picture}
            alt={album.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
            loading="lazy"
          />
        ) : (
          <GradientFallback albumId={album.id} name={album.name} />
        )}

        {/* Bottom fade */}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-zinc-950/60 to-transparent" />

        {/* Actions — top-right */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
          <span
            role="button"
            onClick={onTogglePublic}
            className={cn(
              'w-7 h-7 flex items-center justify-center rounded-xl backdrop-blur-md active:scale-90 transition-all border shadow-sm',
              album.is_public
                ? 'bg-cyan-400/80 border-cyan-400/60'
                : 'bg-black/40 border-white/10'
            )}
          >
            {album.is_public ? (
              <Globe size={12} className="text-white" />
            ) : (
              <Lock size={12} className="text-white/50" />
            )}
          </span>
          {album.name !== 'Favorites' && (
            <span
              role="button"
              onClick={onDelete}
              className="w-7 h-7 flex items-center justify-center rounded-xl bg-black/40 border border-white/10 backdrop-blur-md hover:bg-red-500/60 active:scale-90 transition-all shadow-sm"
            >
              <Trash2
                size={12}
                className="text-white/50 group-hover:text-white"
              />
            </span>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex flex-col min-w-0">
          <p className="text-[14px] font-black truncate leading-tight text-white">
            {album.name}
          </p>
          <p
            className={cn(
              'text-[10px] font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1',
              album.is_public ? 'text-cyan-400' : 'text-white/25'
            )}
          >
            {album.is_public ? <Globe size={9} /> : <Lock size={9} />}
            {album.is_public ? t('albumPublic') : t('albumPrivate')}
          </p>
        </div>
        <ChevronRight
          size={15}
          className="text-white/20 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all shrink-0"
        />
      </div>
    </button>
  );
}

// ─── Album Skeleton ───────────────────────────────────────────────────────────

function AlbumCardSkeleton() {
  return (
    <div className="rounded-3xl bg-white/[0.04] animate-pulse overflow-hidden">
      <div className="aspect-square w-full bg-white/5" />
      <div className="p-4 h-12" />
    </div>
  );
}

// ─── Album Post Card ──────────────────────────────────────────────────────────

function AlbumPostCard({ post }: { post: AlbumPost }) {
  const previewUrl =
    post.result?.url ??
    (Array.isArray(post.result?.media) && post.result.media!.length > 0
      ? post.result.media![0].input
      : null);

  return (
    <div className="rounded-2xl overflow-hidden bg-zinc-900/40 border border-white/[0.06] group relative aspect-square">
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt={post.model_name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-white/10">
          <ImageIcon size={28} />
          <p className="text-[11px] font-bold uppercase tracking-widest px-2 text-center">
            {post.model_name}
          </p>
        </div>
      )}
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
        <p className="text-[11px] font-black text-white/80 truncate">
          {post.model_name}
        </p>
      </div>
    </div>
  );
}

// ─── Detail View ──────────────────────────────────────────────────────────────

function AlbumDetailView({
  albumId,
  onBack,
}: {
  albumId: number;
  onBack: () => void;
}) {
  const t = useTranslations('Profile');
  const haptic = useHaptic();
  const { data, isLoading } = useAlbumPosts(albumId);
  const [copied, setCopied] = useState(false);

  const album = data?.album;
  const posts = data?.items ?? [];

  const handleCopyPublicLink = () => {
    if (!album?.public_id) return;
    haptic.success();
    const url = `${window.location.origin}/albums/public/${album.public_id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success(t('albumLinkCopied'));
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Back + Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            haptic.light();
            onBack();
          }}
          className="w-10 h-10 rounded-2xl bg-zinc-900/60 border border-white/10 flex items-center justify-center active:scale-90 transition-all"
        >
          <ArrowLeft size={18} className="text-white/60" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[18px] font-black truncate leading-tight">
            {album?.name ?? '...'}
          </p>
          <p className="text-[12px] text-white/30 font-bold">
            {posts.length} {t('albumPostsCount')}
          </p>
        </div>
        {/* Public link copy */}
        {album?.is_public && album.public_id && (
          <button
            onClick={handleCopyPublicLink}
            className="w-10 h-10 rounded-2xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center active:scale-90 transition-all"
          >
            {copied ? (
              <Check size={16} className="text-cyan-400" />
            ) : (
              <Copy size={16} className="text-cyan-400" />
            )}
          </button>
        )}
      </div>

      {/* Posts Grid */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-2xl bg-white/[0.04] animate-pulse"
            />
          ))}
        </div>
      ) : posts.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {posts.map((post) => (
            <AlbumPostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="py-16 flex flex-col items-center justify-center gap-3 opacity-25">
          <ImageIcon size={40} />
          <p className="text-[13px] font-bold uppercase tracking-widest">
            {t('albumEmpty')}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main AlbumsTab ───────────────────────────────────────────────────────────

export function AlbumsTab() {
  const t = useTranslations('Profile');
  const haptic = useHaptic();

  const { data: albums = [], isLoading } = useAlbums();
  const createAlbum = useCreateAlbum();
  const deleteAlbum = useDeleteAlbum();
  const toggleVisibility = useToggleAlbumVisibility();

  const [selectedAlbumId, setSelectedAlbumId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');

  const handleCreate = () => {
    const name = newAlbumName.trim();
    if (!name) return;
    createAlbum.mutate(
      { name },
      {
        onSuccess: () => {
          toast.success(t('albumCreated'));
          setShowCreate(false);
          setNewAlbumName('');
        },
        onError: (err: any) => {
          if (err?.response?.status === 409) {
            toast.error(t('albumNameExists'));
          } else {
            toast.error(t('albumCreateError'));
          }
        },
      }
    );
  };

  const handleDelete = (e: React.MouseEvent, albumId: number) => {
    e.stopPropagation();
    haptic.warning();
    if (!window.confirm(t('albumConfirmDelete'))) return;
    deleteAlbum.mutate(albumId, {
      onSuccess: () => toast.success(t('albumDeleted')),
      onError: () => toast.error(t('albumDeleteError')),
    });
  };

  const handleTogglePublic = (e: React.MouseEvent, album: Album) => {
    e.stopPropagation();
    haptic.light();
    toggleVisibility.mutate(
      { albumId: album.id, isPublic: !album.is_public },
      {
        onSuccess: (data) => {
          toast.success(
            data.is_public ? t('albumMadePublic') : t('albumMadePrivate')
          );
        },
        onError: () => toast.error(t('albumVisibilityError')),
      }
    );
  };

  // ── Detail view ──
  if (selectedAlbumId !== null) {
    return (
      <AlbumDetailView
        albumId={selectedAlbumId}
        onBack={() => setSelectedAlbumId(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header row */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[13px] font-black uppercase tracking-[0.15em] text-white/30">
          {t('albumsTitle')}
        </h3>
        <button
          onClick={() => {
            haptic.medium();
            setShowCreate(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 text-[13px] font-black active:scale-95 transition-all hover:bg-cyan-400/20"
        >
          <Plus size={14} />
          {t('albumNew')}
        </button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <AlbumCardSkeleton key={i} />
          ))}
        </div>
      ) : albums.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {albums.map((album) => (
            <AlbumCard
              key={album.id}
              album={album}
              onClick={() => {
                haptic.light();
                setSelectedAlbumId(album.id);
              }}
              onDelete={(e) => handleDelete(e, album.id)}
              onTogglePublic={(e) => handleTogglePublic(e, album)}
            />
          ))}
        </div>
      ) : (
        <div className="py-12 flex flex-col items-center justify-center gap-3 opacity-25">
          <FolderOpen size={40} />
          <p className="text-[13px] font-bold uppercase tracking-widest">
            {t('albumsEmpty')}
          </p>
        </div>
      )}

      {/* ── Create Album Dialog (shadcn) ── */}
      <Dialog
        open={showCreate}
        onOpenChange={(open) => {
          setShowCreate(open);
          if (!open) setNewAlbumName('');
        }}
      >
        <DialogContent className="bg-zinc-950 border border-white/10 rounded-[28px] max-w-sm w-full p-6 gap-0 shadow-2xl">
          <DialogHeader className="mb-5">
            <DialogTitle className="text-[18px] font-black text-white">
              {t('albumCreateTitle')}
            </DialogTitle>
          </DialogHeader>

          <input
            type="text"
            value={newAlbumName}
            onChange={(e) => setNewAlbumName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder={t('albumNamePlaceholder')}
            className="w-full px-5 py-4 rounded-2xl bg-zinc-900/60 border border-white/10 text-white text-[15px] font-bold placeholder:text-white/20 focus:outline-none focus:border-cyan-400/50 transition-colors mb-5"
            autoFocus
            maxLength={64}
          />

          <DialogFooter className="flex flex-row gap-3 sm:justify-start">
            <button
              onClick={() => {
                setShowCreate(false);
                setNewAlbumName('');
              }}
              className="flex-1 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white/50 text-[14px] font-black active:scale-95 transition-all hover:bg-white/8"
            >
              {t('albumCancel')}
            </button>
            <button
              onClick={handleCreate}
              disabled={!newAlbumName.trim() || createAlbum.isPending}
              className="flex-1 py-3.5 rounded-2xl bg-cyan-400 text-white text-[14px] font-black active:scale-95 transition-all disabled:opacity-40 shadow-[0_0_20px_rgba(0,122,255,0.3)]"
            >
              {createAlbum.isPending ? (
                <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                t('albumCreate')
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
