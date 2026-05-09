'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { usePublishPost } from '@/hooks/usePosts';
import { toast } from 'sonner';
import { Loader2, Share2, EyeOff, Edit3, Type } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PublishDialogProps {
  isOpen: boolean;
  onClose: () => void;
  message: any; // Message type from ChatPage
}

export const PublishDialog = ({ isOpen, onClose, message }: PublishDialogProps) => {
  const t = useTranslations('Publish');
  const publish = usePublishPost();
  
  const [hideText, setHideText] = useState(false);
  const [mediaSettings, setMediaSettings] = useState<Record<number, { hide: boolean, replace: boolean }>>(
    Object.fromEntries((message?.inputs?.media || []).map((_: any, i: number) => [i, { hide: false, replace: false }]))
  );

  const handlePublish = async () => {
    try {
      const inputs = {
        ...message.inputs,
        hide_text: hideText,
        media: (message.inputs?.media || []).map((m: any, i: number) => ({
          ...m,
          input: {
            ...(typeof m.input === 'object' ? m.input : { type: 'image', format: 'url', input: m.input }),
            reference: mediaSettings[i] || { hide: false, replace: false }
          }
        }))
      };

      await publish.mutateAsync({
        model_tech_name: message.model,
        version_label: message.version,
        inputs,
        params: message.params || {},
        result: message.result
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
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Share2 className="size-5 text-blue-400" />
            {t('title')}
          </DialogTitle>
          <DialogDescription className="text-white/50">
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Prompt Visibility */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="space-y-0.5">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Type className="size-4 text-white/60" />
                {t('hidePrompt')}
              </Label>
              <p className="text-xs text-white/30">{t('hidePromptDesc')}</p>
            </div>
            <Switch checked={hideText} onCheckedChange={setHideText} />
          </div>

          {/* Media Settings */}
          {mediaList.length > 0 && (
            <div className="space-y-3">
              <Label className="text-[12px] font-bold uppercase tracking-wider text-white/40 px-1">
                {t('mediaSettings')}
              </Label>
              
              <div className="space-y-3">
                {mediaList.map((m: any, i: number) => (
                  <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                    <div className="flex items-center gap-3">
                       <div className="size-10 rounded-lg bg-white/10 overflow-hidden">
                          <img src={m.url || m.input?.input} alt="" className="size-full object-cover" />
                       </div>
                       <span className="text-sm font-medium text-white/80">{t('media')} #{i + 1}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                       <div className="flex items-center justify-between">
                          <Label className="text-xs flex items-center gap-1.5 cursor-pointer" htmlFor={`hide-${i}`}>
                             <EyeOff className="size-3 text-white/40" />
                             {t('hide')}
                          </Label>
                          <Switch 
                            id={`hide-${i}`}
                            checked={mediaSettings[i]?.hide} 
                            onCheckedChange={(val: boolean) => setMediaSettings(prev => ({ ...prev, [i]: { ...prev[i], hide: val } }))} 
                          />
                       </div>
                       <div className="flex items-center justify-between">
                          <Label className="text-xs flex items-center gap-1.5 cursor-pointer" htmlFor={`replace-${i}`}>
                             <Edit3 className="size-3 text-white/40" />
                             {t('replace')}
                          </Label>
                          <Switch 
                            id={`replace-${i}`}
                            checked={mediaSettings[i]?.replace} 
                            onCheckedChange={(val: boolean) => setMediaSettings(prev => ({ ...prev, [i]: { ...prev[i], replace: val } }))} 
                          />
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-start">
          <Button
            disabled={publish.isPending}
            onClick={handlePublish}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl"
          >
            {publish.isPending ? <Loader2 className="animate-spin" /> : t('publish')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
