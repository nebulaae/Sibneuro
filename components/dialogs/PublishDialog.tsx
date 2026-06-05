'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePublishPost } from '@/hooks/usePosts';
import { toast } from 'sonner';
import { Loader2, Share2, EyeOff, Edit3, Type } from 'lucide-react';

interface PublishDialogProps {
  isOpen: boolean;
  onClose: () => void;
  message: any;
  dialogueId?: string;
}

export const PublishDialog = ({
  isOpen,
  onClose,
  message,
  dialogueId,
}: PublishDialogProps) => {
  const t = useTranslations('Publish');
  const publish = usePublishPost();

  const [hideText, setHideText] = useState(false);
  const [mediaSettings, setMediaSettings] = useState<
    Record<number, { hide: boolean; replace: boolean }>
  >(
    Object.fromEntries(
      (message?.inputs?.media || []).map((_: any, i: number) => [
        i,
        { hide: false, replace: false },
      ])
    )
  );

  const handlePublish = async () => {
    try {
      const inputs = {
        ...message.inputs,
        hide_text: hideText,
        dialogueId,
        messages: [
          {
            role: message.role_id ? 'user' : 'assistant', // или правильно определяй роль
            content: message.inputs?.text || message.result?.text,
            inputs: message.inputs,
          },
        ],
      };

      await publish.mutateAsync({
        model_tech_name: message.model,
        version_label: message.version,
        inputs,
        params: message.params || {},
        result: message.result,
      });

      toast.success(t('success'));
      onClose();
    } catch (err: any) {
      toast.error(err.message || t('error'));
    }
  };

  const mediaList = message?.inputs?.media || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-neutral-900 border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="size-5 text-cyan-400" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[420px] pr-4">
          <div className="py-4 space-y-6">
            {/* Hide prompt */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
              <div>
                <Label>{t('hidePrompt')}</Label>
                <p className="text-xs text-white/40">{t('hidePromptDesc')}</p>
              </div>
              <Switch checked={hideText} onCheckedChange={setHideText} />
            </div>

            {/* Media Settings */}
            {mediaList.length > 0 && (
              <div className="space-y-3">
                <Label className="uppercase text-xs tracking-widest text-white/40">
                  {t('mediaSettings')}
                </Label>
                {mediaList.map((m: any, i: number) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4"
                  >
                    {/* media preview + switches */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex justify-between">
                        <Label>{t('hide')}</Label>
                        <Switch
                          checked={mediaSettings[i]?.hide}
                          onCheckedChange={(v) =>
                            setMediaSettings((p) => ({
                              ...p,
                              [i]: { ...(p[i] || {}), hide: v },
                            }))
                          }
                        />
                      </div>
                      <div className="flex justify-between">
                        <Label>{t('replace')}</Label>
                        <Switch
                          checked={mediaSettings[i]?.replace}
                          onCheckedChange={(v) =>
                            setMediaSettings((p) => ({
                              ...p,
                              [i]: { ...(p[i] || {}), replace: v },
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button
            onClick={handlePublish}
            disabled={publish.isPending}
            className="w-full h-16 rounded-[24px] flex items-center justify-center gap-3 font-black text-[17px] transition-all active:scale-[0.98] shadow-2xl bg-[#007AFF] text-white shadow-[0_0_30px_rgba(0,122,255,0.4)]"
          >
            {publish.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              t('publish')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
