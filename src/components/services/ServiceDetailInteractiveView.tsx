"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClientDetailedServiceCard } from "@/components/clients/ClientDetailedServiceCard";
import { ServiceStageModal } from "@/components/services/ServiceStageModal";
import { ServiceDocumentsModal } from "@/components/services/ServiceDocumentsModal";
import { EditServiceModal } from "@/components/services/EditServiceModal";
import { ServiceFinancialHistoryModal } from "@/components/services/ServiceFinancialHistoryModal";
import { ServiceActivityHistoryModal } from "@/components/services/ServiceActivityHistoryModal";
import { CreateInvoiceModal } from "@/components/invoices/CreateInvoiceModal";
import { InvoicePreviewModal } from "@/components/invoices/InvoicePreviewModal";
import { DeleteServiceModal } from "@/components/services/DeleteServiceModal";
import { checkServiceDeletionEligibilityAction, deleteClientServiceAction, removeClientServiceAction, ServiceDeletionEligibility } from "@/app/actions/services";
import { useToast } from "@/components/common/ToastProvider";
import type { DetailedServiceData } from "@/app/actions/client-detailed-services";

interface ServiceDetailInteractiveViewProps {
  service: DetailedServiceData;
  canEdit: boolean;
  isAdmin: boolean;
  clientName: string;
}

export function ServiceDetailInteractiveView({
  service,
  canEdit,
  isAdmin,
  clientName,
}: ServiceDetailInteractiveViewProps) {
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const [stageModalServiceId, setStageModalServiceId] = useState<string | null>(null);
  const [documentsModalService, setDocumentsModalService] = useState<DetailedServiceData | null>(null);
  const [editingService, setEditingService] = useState<DetailedServiceData | null>(null);
  const [financialHistoryService, setFinancialHistoryService] = useState<DetailedServiceData | null>(null);
  const [activityHistoryService, setActivityHistoryService] = useState<DetailedServiceData | null>(null);
  const [createInvoiceService, setCreateInvoiceService] = useState<DetailedServiceData | null>(null);
  const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<DetailedServiceData | null>(null);
  const [serviceEligibility, setServiceEligibility] = useState<ServiceDeletionEligibility | null>(null);
  const [isLoadingServiceCheck, setIsLoadingServiceCheck] = useState(false);

  const handleRefresh = () => {
    router.refresh();
  };

  const handleOpenDeleteService = async (svc: DetailedServiceData) => {
    setServiceToDelete(svc);
    setIsLoadingServiceCheck(true);
    setServiceEligibility(null);
    try {
      const eligibility = await checkServiceDeletionEligibilityAction(svc.id);
      setServiceEligibility(eligibility);
    } catch (err: any) {
      toastError("Eligibility Check Failed", err.message || "Failed to audit service.");
    } finally {
      setIsLoadingServiceCheck(false);
    }
  };

  const handleConfirmDeleteService = async () => {
    if (!serviceToDelete) return;

    try {
      const res = await deleteClientServiceAction(serviceToDelete.id);
      if (res.success) {
        success("Service Deleted", `Service "${serviceToDelete.serviceName}" has been removed.`);
        const targetClientId = serviceToDelete.clientId;
        setServiceToDelete(null);
        setServiceEligibility(null);
        router.push(`/clients/${targetClientId}?tab=services`);
      } else {
        toastError("Cannot Delete Service", res.error || "Failed to delete service.");
      }
    } catch (err: any) {
      toastError("Delete Error", err.message || "Failed to remove service.");
    }
  };

  return (
    <>
      <ClientDetailedServiceCard
        service={service}
        index={0}
        totalServices={1}
        defaultExpanded={true}
        canEdit={canEdit}
        isAdmin={isAdmin}
        clientName={clientName}
        onManageStage={(svcId) => setStageModalServiceId(svcId)}
        onManageService={(svc) => setDocumentsModalService(svc)}
        onAddDocument={(svcId) => setDocumentsModalService(service)}
        onEditService={(svc) => setEditingService(svc)}
        onDeleteService={(svc) => handleOpenDeleteService(svc)}
        onCreateInvoice={(svc) => setCreateInvoiceService(svc)}
        onViewAllInvoices={(svc) => setFinancialHistoryService(svc)}
        onViewFullActivity={(svc) => setActivityHistoryService(svc)}
        onPreviewInvoice={(invId) => setPreviewInvoiceId(invId)}
        onRefresh={handleRefresh}
      />

      {/* 1. Fulfillment Stage Management Modal */}
      {stageModalServiceId && (
        <ServiceStageModal
          isOpen={Boolean(stageModalServiceId)}
          onClose={() => setStageModalServiceId(null)}
          serviceId={stageModalServiceId}
          onSuccess={handleRefresh}
        />
      )}

      {/* 2. Documents & Details Modal */}
      {documentsModalService && (
        <ServiceDocumentsModal
          isOpen={Boolean(documentsModalService)}
          onClose={() => setDocumentsModalService(null)}
          clientId={documentsModalService.clientId}
          clientServiceId={documentsModalService.id}
          serviceName={documentsModalService.serviceName}
          clientName={clientName}
          serviceStatus={documentsModalService.serviceStatus}
          onRefreshParent={handleRefresh}
        />
      )}

      {/* 3. Edit Service Modal */}
      {editingService && (
        <EditServiceModal
          isOpen={Boolean(editingService)}
          onClose={() => setEditingService(null)}
          service={editingService}
          onSuccess={handleRefresh}
        />
      )}

      {/* 4. Financial / Invoice History Modal */}
      {financialHistoryService && (
        <ServiceFinancialHistoryModal
          isOpen={Boolean(financialHistoryService)}
          onClose={() => setFinancialHistoryService(null)}
          serviceName={financialHistoryService.serviceName}
          clientName={clientName}
          invoices={financialHistoryService.invoices}
          payments={financialHistoryService.payments}
          onPreviewInvoice={(invId) => setPreviewInvoiceId(invId)}
        />
      )}

      {/* 5. Activity History Modal */}
      {activityHistoryService && (
        <ServiceActivityHistoryModal
          isOpen={Boolean(activityHistoryService)}
          onClose={() => setActivityHistoryService(null)}
          serviceName={activityHistoryService.serviceName}
          clientName={clientName}
          activities={activityHistoryService.activities}
        />
      )}

      {/* 6. Create Invoice Modal */}
      {createInvoiceService && (
        <CreateInvoiceModal
          isOpen={Boolean(createInvoiceService)}
          onClose={() => setCreateInvoiceService(null)}
          defaultClientId={createInvoiceService.clientId}
          defaultClientName={clientName}
          defaultServiceId={createInvoiceService.id}
          defaultDescription={`${createInvoiceService.serviceName} - Professional Deliverable`}
          defaultAmount={createInvoiceService.contractValue}
          onSuccess={handleRefresh}
        />
      )}

      {/* 6b. Invoice Preview Modal */}
      {previewInvoiceId && (
        <InvoicePreviewModal
          isOpen={Boolean(previewInvoiceId)}
          onClose={() => setPreviewInvoiceId(null)}
          invoiceId={previewInvoiceId}
        />
      )}

      {/* 7. Delete Service Confirmation Modal */}
      {serviceToDelete && (
        <DeleteServiceModal
          isOpen={Boolean(serviceToDelete)}
          onClose={() => {
            setServiceToDelete(null);
            setServiceEligibility(null);
          }}
          onConfirm={handleConfirmDeleteService}
          serviceName={serviceToDelete.serviceName}
          eligibility={serviceEligibility}
          isLoadingCheck={isLoadingServiceCheck}
        />
      )}
    </>
  );
}
