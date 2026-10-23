import { Modal, Button, TextField, Label, Input, NumberField, Description } from "@heroui/react";
import { Scale } from "lucide-react";
import { useState } from "react";
import type { Batch } from "../types";

interface DriageModalProps {
  batch: Batch | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (batchId: string, currentQty: number, deductQty: number, reason: string) => Promise<void>;
}

export function DriageModal({ batch, isOpen, onClose, onSubmit }: DriageModalProps) {
  const [deductQty, setDeductQty] = useState<number>(2);
  const [reason, setReason] = useState<string>("Handling spillage & natural moisture driage loss");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!batch) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deductQty <= 0) return;
    setIsSubmitting(true);
    try {
      await onSubmit(batch.id, batch.remainingQty, deductQty, reason);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const newBalance = Math.max(0, batch.remainingQty - deductQty);

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="md">
          <Modal.Dialog>
            <form onSubmit={handleSubmit}>
              <Modal.Header>
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-warning" />
                  <Modal.Heading className="text-base font-bold">
                    Log Spillage / Moisture Driage Adjustment
                  </Modal.Heading>
                </div>
                <Modal.CloseTrigger />
              </Modal.Header>

              <Modal.Body className="space-y-4">
                <p className="text-xs text-muted">
                  Deduct minor physical weight losses from handling spillage or humidity evaporation to keep the FIFO ledger in 100% sync with actual physical bags.
                </p>

                <div className="p-3 bg-muted/10 rounded-lg text-xs space-y-1">
                  <div><strong>Batch ID:</strong> {batch.id} ({batch.commodity})</div>
                  <div><strong>Location:</strong> {batch.bayLocation}</div>
                  <div><strong>Current Ledger Balance:</strong> {batch.remainingQty} Quintals</div>
                </div>

                <NumberField
                  value={deductQty}
                  onChange={(val) => setDeductQty(Number(val) || 0)}
                  minValue={0.1}
                  maxValue={batch.remainingQty}
                >
                  <Label>Deduction Quantity (in Quintals)</Label>
                  <NumberField.Group>
                    <NumberField.DecrementButton />
                    <NumberField.Input />
                    <NumberField.IncrementButton />
                  </NumberField.Group>
                  <Description>
                    Adjusted remaining balance will be: <strong>{newBalance.toFixed(1)} Quintals</strong>
                  </Description>
                </NumberField>

                <TextField
                  value={reason}
                  onChange={setReason}
                  fullWidth
                >
                  <Label>Driage Verification Note / Cause</Label>
                  <Input placeholder="e.g. Weighbridge variance, torn gunny bag repacked" />
                  <Description>Reason recorded permanently in official audit ledger.</Description>
                </TextField>
              </Modal.Body>

              <Modal.Footer className="flex justify-between">
                <Button variant="secondary" onPress={onClose} isDisabled={isSubmitting}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" isDisabled={isSubmitting}>
                  {isSubmitting ? "Adjusting Ledger..." : "Confirm Ledger Adjustment"}
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
