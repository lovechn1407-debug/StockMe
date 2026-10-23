import { Modal, Button, TextField, Label, Input, Chip } from "@heroui/react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { Batch } from "../types";

interface FumigationModalProps {
  batch: Batch | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleStatus: (batchId: string, newStatus: Batch["status"], note: string) => Promise<void>;
}

export function FumigationModal({ batch, isOpen, onClose, onToggleStatus }: FumigationModalProps) {
  const [note, setNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!batch) return null;

  const isFumigated = batch.status === "Under Fumigation";
  const isQualityHold = batch.status === "Quality Hold";
  const isLocked = isFumigated || isQualityHold;

  const targetStatus: Batch["status"] = isLocked ? "Eligible" : "Under Fumigation";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const defaultNote = isLocked
        ? "Safe degassing protocol completed. Batch verified clean and restored to eligible FIFO dispatch queue."
        : "Aluminium Phosphide (ALP) gas cover sealed for scheduled pest control protocol.";
      await onToggleStatus(batch.id, targetStatus, note || defaultNote);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog>
            <form onSubmit={handleSubmit}>
              <Modal.Header>
                <div className="flex items-center gap-2">
                  {isLocked ? (
                    <ShieldCheck className="w-5 h-5 text-success" />
                  ) : (
                    <ShieldAlert className="w-5 h-5 text-warning" />
                  )}
                  <Modal.Heading className="text-base font-bold">
                    {isLocked ? "Release Fumigation / Quality Hold" : "Lock Batch for Fumigation Protocol"}
                  </Modal.Heading>
                </div>
                <Modal.CloseTrigger />
              </Modal.Header>

              <Modal.Body className="space-y-4">
                <div className="p-3 bg-muted/10 rounded-lg text-xs space-y-1">
                  <div><strong>Batch ID:</strong> {batch.id} ({batch.commodity})</div>
                  <div><strong>Bay Location:</strong> {batch.bayLocation}</div>
                  <div>
                    <strong>Current Status:</strong>{" "}
                    <Chip
                      size="sm"
                      color={batch.status === "Eligible" ? "success" : "warning"}
                      variant="soft"
                    >
                      {batch.status}
                    </Chip>
                  </div>
                  {batch.fumigationNote && (
                    <div className="text-muted mt-1 italic">
                      Note: {batch.fumigationNote}
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted">
                  {isLocked
                    ? "Restoring this batch to 'Eligible' allows the Smart FIFO Engine to allocate it for immediate dispatches based on receipt age."
                    : "Placing this batch 'Under Fumigation' instructs the FIFO engine to safely skip it without penalizing compliance score until degassing is certified."}
                </p>

                <TextField
                  value={note}
                  onChange={setNote}
                  fullWidth
                >
                  <Label>
                    {isLocked ? "Degassing Verification Details" : "Fumigation Chemical & Protocol Remarks"}
                  </Label>
                  <Input
                    placeholder={
                      isLocked
                        ? "e.g. Aeration completed, phosphine detector negative, certified by Technical Officer"
                        : "e.g. 7-day ALP gas cover sealed by Plant Protection Officer"
                    }
                  />
                </TextField>
              </Modal.Body>

              <Modal.Footer className="flex justify-between">
                <Button variant="secondary" onPress={onClose} isDisabled={isSubmitting}>
                  Cancel
                </Button>
                <Button
                  variant={isLocked ? "primary" : "secondary"}
                  type="submit"
                  isDisabled={isSubmitting}
                >
                  {isSubmitting
                    ? "Updating Status..."
                    : isLocked
                    ? "Release & Mark Eligible"
                    : "Confirm Fumigation Lock"}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
