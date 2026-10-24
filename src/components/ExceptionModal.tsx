import { Modal, Button, TextField, Label, Input, Alert } from "@heroui/react";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import { useState, useEffect } from "react";
import type { FIFOException } from "../types";
import { getStoredOfficerName, getStoredOfficerDesignation } from "../lib/settings";

interface ExceptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: (data: {
    reason: FIFOException["reason"];
    remarks: string;
    officerName: string;
  }) => void;
  olderBatchId: string;
  olderBatchAge: number;
  chosenBatchId: string;
  chosenBatchAge: number;
  defaultOfficerName?: string;
}

export function ExceptionModal({
  isOpen,
  onClose,
  onApprove,
  olderBatchId,
  olderBatchAge,
  chosenBatchId,
  chosenBatchAge,
  defaultOfficerName,
}: ExceptionModalProps) {
  const getInitialOfficer = () => {
    if (defaultOfficerName) return defaultOfficerName;
    const name = getStoredOfficerName();
    const desig = getStoredOfficerDesignation();
    return `${name} (${desig})`;
  };

  const [reason, setReason] = useState<FIFOException["reason"]>("Physical Access Blocked");
  const [remarks, setRemarks] = useState<string>("");
  const [officerName, setOfficerName] = useState<string>(getInitialOfficer);

  useEffect(() => {
    if (isOpen) {
      setOfficerName(getInitialOfficer());
    }
  }, [isOpen, defaultOfficerName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarks.trim() || !officerName.trim()) return;

    onApprove({
      reason,
      remarks,
      officerName,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <form onSubmit={handleSubmit}>
              <Modal.Header>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-danger" />
                  <Modal.Heading className="text-base font-bold text-danger">
                    Mandatory FIFO Exception Approval Form
                  </Modal.Heading>
                </div>
                <Modal.CloseTrigger />
              </Modal.Header>

              <Modal.Body className="space-y-4">
                <Alert status="danger">
                  <Alert.Indicator>
                    <AlertTriangle className="w-5 h-5 text-danger" />
                  </Alert.Indicator>
                  <Alert.Content>
                    <Alert.Title className="font-bold">
                      Non-FIFO Dispatch Authorization Required
                    </Alert.Title>
                    <Alert.Description>
                      You are allocating newer batch <strong>{chosenBatchId}</strong> ({chosenBatchAge} Days old) while older batch <strong>{olderBatchId}</strong> ({olderBatchAge} Days old) still has active stock. Government iPDS guidelines require formal exception recording.
                    </Alert.Description>
                  </Alert.Content>
                </Alert>

                {/* Reason Selection */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">
                    Official Exception Reason
                  </Label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value as FIFOException["reason"])}
                    className="w-full text-sm font-medium bg-surface border border-border rounded-md px-3 py-2 text-foreground focus:outline-none"
                  >
                    <option value="Physical Access Blocked">
                      Physical Access Blocked (Corridor maintenance or stack obstruction)
                    </option>
                    <option value="Fumigation in Progress">
                      Fumigation in Progress (ALP gas cover active)
                    </option>
                    <option value="Damaged Packaging">
                      Damaged Packaging (Requires re-bagging before road transport)
                    </option>
                    <option value="Quality Re-check">
                      Quality Re-check (Moisture sample pending lab test)
                    </option>
                    <option value="Emergency Requisition">
                      Emergency Requisition (Specific lot requested by District Magistrate)
                    </option>
                  </select>
                </div>

                {/* Justification remarks */}
                <TextField
                  value={remarks}
                  onChange={setRemarks}
                  isRequired
                  fullWidth
                >
                  <Label>Field Inspector / Godown Justification Remarks</Label>
                  <Input placeholder="e.g. Forklift aisle 4 blocked by pallet stack inspection; authorized by AGO." />
                </TextField>

                {/* Approving Officer Name */}
                <TextField
                  value={officerName}
                  onChange={setOfficerName}
                  isRequired
                  fullWidth
                >
                  <Label>Approving Officer Name & Designation</Label>
                  <Input placeholder="e.g. A. K. Sharma (Assistant Godown Officer)" />
                </TextField>
              </Modal.Body>

              <Modal.Footer className="flex justify-between">
                <Button variant="secondary" onPress={onClose}>
                  Cancel & Follow FIFO
                </Button>
                <Button variant="danger" type="submit">
                  Sign & Authorize Exception
                </Button>
              </Modal.Footer>
            </form>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
