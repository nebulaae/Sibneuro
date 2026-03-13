'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useChatHistory, useUpload } from '@/hooks/useApiExtras';
import { useGenerateAI } from '@/hooks/useGenerations';
import { ChevronLeft, Send, ImagePlus, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function ChatPage({
  params,
}: {
  params: { dialogueId: string };
}) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadedType, setUploadedType] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: messages, isLoading } = useChatHistory(params.dialogueId);
  const generate = useGenerateAI();
  const upload = useUpload();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    try {
      const res = await upload.mutateAsync(files[0]);
      setUploadedUrl(res.url);
      setUploadedType(res.type);
    } catch (err) {
      toast.error('Ошибка загрузки файла');
    }
  };

  const handleSend = () => {
    if (!text.trim() && !uploadedUrl) return;

    // Берем модель из первого сообщения (или из контекста)
    const firstMsg = messages?.[0];
    if (!firstMsg) return;

    generate.mutate(
      {
        tech_name: firstMsg.model, // Необходимо получить из бэкенда, предполагается что в хистори это есть
        dialogue_id: params.dialogueId,
        inputs: {
          text: text || null,
          media: uploadedUrl
            ? [{ type: uploadedType, format: 'url', input: uploadedUrl }]
            : [],
        },
      },
      {
        onSuccess: () => {
          setText('');
          setUploadedUrl(null);
          setUploadedType(null);
        },
      }
    );
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="sticky top-0 z-10 flex items-center px-4 py-3 bg-background/80 backdrop-blur-md border-b border-border">
        <button onClick={() => router.back()} className="mr-3">
          <ChevronLeft className="size-6 text-foreground" />
        </button>
        <span className="font-semibold">Диалог</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {isLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          messages?.map((msg: any, i: number) => (
            <div key={i} className="space-y-4">
              {/* User Message */}
              {(msg.inputs?.text || msg.inputs?.media) && (
                <div className="flex justify-end">
                  <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2 max-w-[80%] text-sm">
                    {msg.inputs.text && <p>{msg.inputs.text}</p>}
                    {msg.inputs.media?.map((m: any, idx: number) => (
                      <img
                        key={idx}
                        src={m.input}
                        alt=""
                        className="mt-2 rounded-lg w-full max-w-50"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Assistant Message */}
              <div className="flex justify-start">
                <div className="bg-secondary text-secondary-foreground rounded-2xl rounded-tl-sm px-4 py-2 max-w-[80%] text-sm">
                  {msg.status === 'processing' ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />{' '}
                      <span>Генерация...</span>
                    </div>
                  ) : msg.status === 'error' ? (
                    <span className="text-destructive">
                      Ошибка генерации: {msg.error}
                    </span>
                  ) : (
                    <>
                      {msg.result?.text && (
                        <p className="whitespace-pre-wrap">{msg.result.text}</p>
                      )}
                      {msg.result?.media?.map((m: any, idx: number) => (
                        <div key={idx} className="mt-2">
                          {m.type === 'image' && (
                            <img
                              src={m.input || m.url}
                              alt=""
                              className="rounded-lg max-w-full"
                            />
                          )}
                          {m.type === 'video' && (
                            <video
                              src={m.input || m.url}
                              controls
                              className="rounded-lg max-w-full"
                            />
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-3 bg-background border-t border-border z-20 md:left-65">
        {uploadedUrl && (
          <div className="mb-2 relative inline-block">
            <img
              src={uploadedUrl}
              className="h-16 rounded-md border border-border object-cover"
              alt="upload preview"
            />
            <button
              onClick={() => setUploadedUrl(null)}
              className="absolute -top-2 -right-2 bg-black rounded-full p-1"
            >
              <X className="size-3 text-white" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2 bg-secondary rounded-2xl p-2 border border-border">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*,.heic,video/*,audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 h-10 w-10 rounded-full text-muted-foreground"
            onClick={() => fileInputRef.current?.click()}
          >
            {upload.isPending ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <ImagePlus className="size-5" />
            )}
          </Button>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Сообщение..."
            className="min-h-10 max-h-30 bg-transparent border-0 focus-visible:ring-0 p-2 resize-none"
            rows={1}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={(!text.trim() && !uploadedUrl) || generate.isPending}
            className="shrink-0 h-10 w-10 rounded-full bg-primary hover:bg-primary/90 text-white"
          >
            {generate.isPending ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
