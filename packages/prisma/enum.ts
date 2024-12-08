// For some reason, the enum types are not exported from the @prisma/client package
// so we need to export them manually

export {
  CommissionInterval,
  CommissionType,
  PartnerRole,
  PartnerStatus,
  PayoutStatus,
  PayoutType,
  ProgramEnrollmentStatus,
  ProgramResourceType,
  ProgramType,
  Role,
  SaleStatus,
  WebhookReceiver,
} from "@prisma/client";
