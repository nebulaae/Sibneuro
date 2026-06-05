'use client';

import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  ImageIcon,
  Loader2,
  AlertCircle,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { AlbumPost, usePublicAlbum } from '@/hooks/useAlbums';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PALETTES = [
  ['#0A0A1A', '#1a1a3e'],
  ['#0A0F0A', '#0d2b0d'],
  ['#1A0A0A', '#2d0d0d'],
  ['#0A0A14', '#0d1a2b'],
  ['#14080A', '#2b0d14'],
  ['#0A1014', '#0d2228'],
];

function getBg(id: number) {
  const [a, b] = PALETTES[id % PALETTES.length];
  return `radial-gradient(ellipse at 30% 20%, ${b}99, ${a} 70%)`;
}

function getMediaUrl(post: AlbumPost): string | null {
  return (
    post.result?.url ??
    (Array.isArray(post.result?.media) && post.result.media!.length > 0
      ? post.result.media![0].input
      : null)
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-white/[0.06] rounded-2xl ${className}`} />
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({
  post,
  index,
  onOpen,
}: {
  post: AlbumPost;
  index: number;
  onOpen: (post: AlbumPost) => void;
}) {
  const url = getMediaUrl(post);

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.35,
        delay: index * 0.04,
        ease: [0.16, 1, 0.3, 1],
      }}
      onClick={() => onOpen(post)}
      className="group relative aspect-square w-full overflow-hidden rounded-2xl bg-zinc-950 ring-1 ring-white/[0.07] hover:ring-white/20 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
    >
      {url ? (
        <img
          src={url}
          alt={post.model_name ?? ''}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          loading="lazy"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: getBg(post.id) }}
        >
          <Sparkles size={22} className="text-white/20" />
        </div>
      )}

      {/* Overlay on hover */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300" />

      {/* Model name */}
      <div className="absolute inset-x-0 bottom-0 translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 p-3">
        <p className="text-[10px] font-semibold text-white/70 uppercase tracking-[0.12em] truncate">
          {post.model_name}
        </p>
      </div>

      {/* Cost */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <span className="text-[10px] font-bold text-white/60 bg-black/50 backdrop-blur px-1.5 py-0.5 rounded-md">
          ◈{post.cost}
        </span>
      </div>
    </motion.button>
  );
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({
  posts,
  initialIndex,
  onClose,
}: {
  posts: AlbumPost[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(initialIndex);
  const post = posts[current];
  const url = getMediaUrl(post);

  const prev = useCallback(() => setCurrent((i) => Math.max(0, i - 1)), []);
  const next = useCallback(
    () => setCurrent((i) => Math.min(posts.length - 1, i + 1)),
    [posts.length]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, prev, next]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 bg-black/95 flex flex-col"
      onClick={onClose}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-5 py-4 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-medium text-white/40">
            {current + 1} / {posts.length}
          </span>
          <span className="text-[13px] font-semibold text-white/70 truncate max-w-[180px]">
            {post.model_name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {url && (
            <a
              href={url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all"
            >
              <Download size={15} />
            </a>
          )}
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Image area */}
      <div
        className="flex-1 flex items-center justify-center relative px-16 min-h-0"
        onClick={(e) => e.stopPropagation()}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={post.id}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative max-h-full"
          >
            {url ? (
              <img
                src={url}
                alt=""
                className="max-h-[calc(100vh-180px)] max-w-full rounded-2xl object-contain"
              />
            ) : (
              <div
                className="w-72 h-72 rounded-2xl flex items-center justify-center"
                style={{ background: getBg(post.id) }}
              >
                <Sparkles size={40} className="text-white/20" />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Nav arrows */}
        {current > 0 && (
          <button
            onClick={prev}
            className="absolute left-4 w-10 h-10 rounded-xl bg-white/[0.07] hover:bg-white/[0.14] border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all"
          >
            <ChevronLeft size={18} />
          </button>
        )}
        {current < posts.length - 1 && (
          <button
            onClick={next}
            className="absolute right-4 w-10 h-10 rounded-xl bg-white/[0.07] hover:bg-white/[0.14] border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all"
          >
            <ChevronRight size={18} />
          </button>
        )}
      </div>

      {/* Caption */}
      {post.inputs?.text && (
        <div
          className="px-5 py-4 shrink-0 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-[13px] text-white/30 max-w-md mx-auto line-clamp-2 leading-relaxed">
            {post.inputs.text}
          </p>
        </div>
      )}

      {/* Filmstrip */}
      <div
        className="flex gap-2 px-5 pb-5 overflow-x-auto shrink-0 scrollbar-none"
        onClick={(e) => e.stopPropagation()}
      >
        {posts.map((p, i) => {
          const u = getMediaUrl(p);
          return (
            <button
              key={p.id}
              onClick={() => setCurrent(i)}
              className={`shrink-0 w-12 h-12 rounded-xl overflow-hidden transition-all duration-200 ${
                i === current
                  ? 'ring-2 ring-white/60 opacity-100'
                  : 'opacity-40 hover:opacity-70 ring-1 ring-white/10'
              }`}
            >
              {u ? (
                <img src={u} alt="" className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full"
                  style={{ background: getBg(p.id) }}
                />
              )}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PublicAlbumPage() {
  const params = useParams();
  const publicId = params?.albumId as string;
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const { data, isLoading, error } = usePublicAlbum(publicId ?? null);

  // Loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black p-6">
        {/* Header skeleton */}
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="w-14 h-14 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3.5 w-20" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      </div>
    );
  }

  // Error / not found
  if (error || !data) {
    const isNotFound = !data || (error as any)?.status === 404;
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center">
          {isNotFound ? (
            <Lock size={24} className="text-white/20" />
          ) : (
            <AlertCircle size={24} className="text-red-400/60" />
          )}
        </div>
        <div>
          <p className="text-[17px] font-semibold text-white/60 mb-1">
            {isNotFound ? 'Альбом не найден' : 'Ошибка загрузки'}
          </p>
          <p className="text-[13px] text-white/25 leading-relaxed max-w-[260px]">
            {isNotFound
              ? 'Альбом не существует или скрыт владельцем'
              : 'Попробуйте обновить страницу'}
          </p>
        </div>
      </div>
    );
  }

  const { album, items } = data;

  return (
    <>
      <div className="min-h-screen bg-black text-white">
        {/* ── Header ── */}
        <div className="px-5 pt-10 pb-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-4"
          >
            {/* Album cover */}
            <div className="w-[60px] h-[60px] rounded-2xl overflow-hidden shrink-0 ring-1 ring-white/10">
              {album.picture ? (
                <img
                  src={album.picture}
                  alt={album.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-[24px] font-black text-white/40"
                  style={{ background: getBg(album.id) }}
                >
                  {album.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0">
              <h1 className="text-[20px] font-bold text-white tracking-tight truncate">
                {album.name}
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[12px] text-white/30 font-medium">
                  {items.length}{' '}
                  {items.length === 1
                    ? 'работа'
                    : items.length < 5
                      ? 'работы'
                      : 'работ'}
                </span>
                <span className="text-white/15">·</span>
                <span className="text-[12px] text-white/25 font-medium uppercase tracking-wide">
                  публичный
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* ── Grid ── */}
        <div className="px-3 pb-16">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-24 text-white/20">
              <ImageIcon size={32} strokeWidth={1.5} />
              <p className="text-[13px] font-medium uppercase tracking-widest">
                Пусто
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-[3px]">
              {items.map((post, index) => (
                <PostCard
                  key={post.id}
                  post={post}
                  index={index}
                  onOpen={(p) =>
                    setLightboxIndex(items.findIndex((x) => x.id === p.id))
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pb-8 flex items-center justify-center gap-2 text-white/[0.12]">
          <Sparkles size={12} />
          <span className="text-[11px] font-semibold uppercase tracking-widest">
            AI Gallery
          </span>
        </div>
      </div>

      <AnimatePresence>
        {lightboxIndex !== null && (
          <Lightbox
            posts={items}
            initialIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
