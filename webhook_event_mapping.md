# Webhook Event → Trigger Mapping

This document maps every backend event to its corresponding n8n webhook endpoint.

## Current Status

| # | Event | Webhook Endpoint | Triggered From | n8n Status |
|---|-------|-----------------|----------------|------------|
| 1 | Patient Registration | `Registration` | `patient.controller.js:304` | ✅ Active |
| 2 | New Appointment Created | `appointment` | `appointment.controller.js:519` | ✅ Active |
| 3 | Appointment Modified/Rescheduled | `appointment-upgradation` | `appointment.controller.js:705` | ✅ Active |
| 4 | 24h Reminder (Manual API) | `24hr-message` | `appointment.controller.js:1285` | ✅ Active |
| 5 | 24h Reminder (Daily Cron) | `24hr-message` | `cronJobs.js:72` | ✅ Active |
| 6 | Doctor Running Late | `doctor-update` | `doctorLateWorkflow.js:125` | ❌ **Not Found** |
| 7 | Doctor Arrived | `doctor-update` | `doctorLateWorkflow.js:206` | ❌ **Not Found** |
| 8 | Doctor Delay (Token) | `doctor-update` | `token.controller.js:755` | ❌ **Not Found** |
| 9 | Set Today Start Time (Notify) | `doctor-update` | `availability.controller.js:547` | ❌ **Not Found** |
| 10 | Notify Patients of Time | `doctor-update` | `availability.controller.js:637` | ❌ **Not Found** |

> [!WARNING]
> The `doctor-update` webhook is **not registered** on your n8n instance (`https://n8n.brahmaastra.ai`).
> You need to create and activate a workflow in n8n with path `/webhook/doctor-update` to receive these events.

## Action Required: Create `doctor-update` Workflow in n8n

1. Open n8n at `https://n8n.brahmaastra.ai`
2. Create a new workflow
3. Add a **Webhook** node with:
   - HTTP Method: `POST`
   - Path: `doctor-update`
4. Add your downstream logic (WhatsApp notification, email, etc.)
5. **Activate** the workflow (toggle it ON)

## Payload Schemas

### `doctor-update` payload (for reference when creating the n8n workflow)
```json
{
  "event_type": "DOCTOR_RUNNING_LATE | DOCTOR_ARRIVED | APPOINTMENT_TIME_UPDATED",
  "batch_id": "BATCH-2026-XXXX",
  "parent_wa_id": "91XXXXXXXXXX",
  "parent_name": "Parent Name",
  "child_name": "Child Name",
  "doctor_name": "Dr. Name",
  "delay_minutes": 30,
  "original_time": "10:00 AM",
  "new_time": "10:30 AM",
  "token": "Token #1",
  "appointment_id": "APT-XXXX",
  "clinic_name": "Dr. Indu Child Care Clinic",
  "clinic_address": "Clinic Address"
}
```
