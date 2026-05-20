import { Dialog, DialogContent } from '@/components/ui/dialog';

export function PaymentDialog({
  url,
  open,
  onOpenChange,
}: {
  url: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 border-0 overflow-hidden w-[95vw] max-w-lg h-[80vh] sm:h-[600px] bg-black rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.08)]">
        {url && (
          <iframe
            src={url}
            className="w-full h-full border-0 bg-white rounded-3xl"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
