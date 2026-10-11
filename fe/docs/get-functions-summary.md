**Get/ GetAll Functions Summary**

This document lists functions across the repository whose names start with `get` or `getAll` that were found by a regex search of `src/`.

Notes:
- This file contains the matches collected so far (by file). If you want a guaranteed exhaustive machine-generated list (no caps/truncation), I can run a short Node script to extract signatures from every file and produce a complete table.

| File | Function | Line (approx) | Notes |
|---|---|---:|---|
| `src/services/testOrderService.js` | `getTestParameters` | 21 | service — test parameters |
| `src/services/testOrderService.js` | `getTestPackage` | 35 | |
| `src/services/testOrderService.js` | `getTestPackages` | 53 | |
| `src/services/testOrderService.js` | `getAllTestPackages` | 72 | |
| `src/services/testOrderService.js` | `getAllTestPackageCriteria` | 83 | |
| `src/services/testOrderService.js` | `getTestPackageCriteria` | 104 | filtered/package criteria helper |
| `src/services/testOrderService.js` | `getPackageCriteriaById` | 152 | direct package -> criteria lookup |
| `src/services/testOrderService.js` | `getTestCriterion` | 168 | fetch single criterion |
| `src/services/testOrderService.js` | `getAllTestCriteria` | 187 | supports `{ fetchAll: true }` (paged iteration) |
| `src/services/testOrderService.js` | `getCriteriaForPackage` | 227 | composite helper to resolve criteria for a package |
| `src/services/testOrderService.js` | `getResultsByAppointment` | 418 | |
| `src/services/testOrderService.js` | `getAllTestResults` | 432 | |
| `src/services/testOrderService.js` | `getTestResult` | 502 | |
| `src/services/testOrderService.js` | `getAllTestParameters` | 516 | |
| `src/services/testOrderService.js` | `getTestParametersByResultId` | 530 | |
| `src/services/testOrderService.js` | `getReagents` | 560 | |
| `src/services/testOrderService.js` | `getDevices` | 585 | |
| `src/services/testOrderService.js` | `getAllLabRooms` | 619 | |
| `src/services/testOrderService.js` | `getLabRoomById` | 631 | |
| `src/services/testOrderService.js` | `getAllLabRoomsGateway` | 645 | |
| `src/services/testOrderService.js` | `getLabRoomByIdGateway` | 656 | |
| `src/services/testOrderService.js` | `getAllDoctorRooms` | 670 | |
| `src/services/testOrderService.js` | `getDoctorRoomById` | 682 | |
| `src/services/testOrderService.js` | `getAllDoctorRoomsGateway` | 695 | |
| `src/services/testOrderService.js` | `getDoctorRoomByIdGateway` | 706 | |
| `src/services/testOrderService.js` | `getAllLabAssignmentsGateway` | 719 | |
| `src/services/testOrderService.js` | `getLabAssignmentByIdGateway` | 730 | |
| `src/services/testOrderService.js` | `getAllLabUserProfiles` | 789 | |
| `src/services/testOrderService.js` | `getAllLabUserProfilesGateway` | 821 | |
| `src/services/testOrderService.js` | `getLabUserProfileById` | 833 | |
| `src/services/testOrderService.js` | `getLabUserProfileByIdGateway` | 846 | |
| `src/services/testOrderService.js` | `getLabUserProfileByEmailGateway` | 859 | |
| `src/services/testOrderService.js` | `getAllTestOrderComments` | 873 | |
| `src/services/testOrderService.js` | `getTestOrderCommentById` | 885 | |
| `src/services/testOrderService.js` | `getTestOrderCommentsByAppointment` | 898 | |
| `src/services/testOrderService.js` | `getAllFlaggingConfigurations` | 949 | |
| `src/services/testOrderService.js` | `getFlaggingConfigurationById` | 961 | |
| `src/services/testOrderService.js` | `getAllFlaggingConfigLogs` | 975 | |
| `src/services/testOrderService.js` | `getFlaggingConfigLogById` | 987 | |

| `src/services/medicalService.js` | `getAllServices` | 6 | |
| `src/services/medicalService.js` | `getServiceById` | 20 | |

| `src/services/roleService.js` | `getAllRoles` | 29 | |
| `src/services/roleService.js` | `getRoleById` | 52 | |
| `src/services/roleService.js` | `getRolePermissions` | 73 | |
| `src/services/roleService.js` | `getPermissionsByRole` | 91 | |
| `src/services/roleService.js` | `getAllUsers` | 113 | |
| `src/services/roleService.js` | `getUsersByRole` | 131 | |

| `src/services/shiftService.js` | `getAllShifts` | 19 | |
| `src/services/shiftService.js` | `getShifts` | 30 | alias to `getAllShifts` |
| `src/services/shiftService.js` | `getShiftById` | 34 | |
| `src/services/shiftService.js` | `getShiftsByDate` | 74 | |
| `src/services/shiftService.js` | `getShiftsByUser` | 109 | |
| `src/services/shiftService.js` | `getAllLabAssignments` | 138 | |
| `src/services/shiftService.js` | `getLabAssignmentById` | 149 | |

| `src/services/userManagementService.js` | `getAllUsers` | 29 | |
| `src/services/userManagementService.js` | `getUsersByRole` | 41 | |
| `src/services/userManagementService.js` | `getUserById` | 54 | |
| `src/services/userManagementService.js` | `getUserStats` | 120 | |

| `src/services/vnpayService.js` | `getAllPayments` | 154 | |
| `src/services/vnpayService.js` | `getPaymentById` | 174 | |

| `src/services/warehouseService.js` | `getAllEquipment` | 90 | |
| `src/services/warehouseService.js` | `getEquipmentById` | 121 | |
| `src/services/warehouseService.js` | `getAllReagents` | 207 | |
| `src/services/warehouseService.js` | `getReagentById` | 237 | |

| `src/utils/statusHelper.js` | `getNextValidStatuses` | 51 | utility functions for status labels/badges |
| `src/utils/statusHelper.js` | `getStatusLabel` | 98 | |
| `src/utils/statusHelper.js` | `getStatusBadgeColor` | 143 | |
| `src/utils/statusHelper.js` | `getStatusIcon` | 181 | |
| `src/utils/statusHelper.js` | `getWorkflowProgress` | 312 | |
| `src/utils/statusHelper.js` | `getWorkflowStep` | 335 | |
| `src/utils/statusHelper.js` | `getWorkflowStepLabel` | 356 | |
| `src/utils/statusHelper.js` | `getAppointmentStatusFromSample` | 380 | |
| `src/utils/statusHelper.js` | `getAppointmentStatusFromLabTest` | 395 | |

| `src/utils/roleUtils.js` | `getRoleById` | 109 | role utilities |
| `src/utils/roleUtils.js` | `getRoleByKey` | 118 | |
| `src/utils/roleUtils.js` | `getRoleIdFromKey` | 128 | |
| `src/utils/roleUtils.js` | `getRoleKeyFromId` | 137 | |
| `src/utils/roleUtils.js` | `getRoleNameFromId` | 146 | |
| `src/utils/roleUtils.js` | `getAllRoles` | 250 | |
| `src/utils/roleUtils.js` | `getRoleDisplayName` | 259 | |

| `src/shared/utils/status/statusHelper.js` | `getNextValidStatuses` | 51 | shared copy of status helpers |
| `src/shared/utils/status/statusHelper.js` | `getStatusLabel` | 98 | |
| `src/shared/utils/status/statusHelper.js` | `getStatusBadgeColor` | 144 | |
| `src/shared/utils/status/statusHelper.js` | `getStatusIcon` | 183 | |
| `src/shared/utils/status/statusHelper.js` | `getWorkflowProgress` | 315 | |
| `src/shared/utils/status/statusHelper.js` | `getWorkflowStep` | 338 | |
| `src/shared/utils/status/statusHelper.js` | `getWorkflowStepLabel` | 359 | |
| `src/shared/utils/status/statusHelper.js` | `getAppointmentStatusFromSample` | 383 | |
| `src/shared/utils/status/statusHelper.js` | `getAppointmentStatusFromLabTest` | 398 | |

| `src/shared/templates/email/resultNotification.js` | `getResultNotificationSubject` | 1 | email template helpers |
| `src/shared/templates/email/resultNotification.js` | `getResultNotificationTemplate` | 7 | |
| `src/shared/templates/email/paymentConfirmation.js` | `getPaymentConfirmationTemplate` | 7 | |
| `src/shared/templates/email/paymentConfirmation.js` | `getPaymentConfirmationSubject` | 11 | |
| `src/shared/templates/email/loginCredentials.js` | `getLoginCredentialsTemplate` | 7 | |
| `src/shared/templates/email/loginCredentials.js` | `getLoginCredentialsSubject` | 45 | |

| `src/pages/public/Services.js` | `getStatusBadge` | 427 | local helper used in UI |
| `src/pages/admin/Appointments.js` | `getSampleBarcode` | 632 | local helper |
| `src/pages/admin/Appointments.js` | `getSortIcon` | 1151 | local helper |
| `src/pages/admin/Appointments.js` | `getPatientName` | 1156 | local helper |
| `src/pages/admin/Appointments.js` | `getDoctorName` | 1197 | local helper |

More matches were discovered across `src/` while compiling this list (the search returns results in batches). If you'd like a fully exhaustive table (no caps/truncation) I can:

- Option A: run a small Node script to parse every .js/.jsx/.ts/.tsx file and extract function names beginning with `get`/`getAll` and produce a complete Markdown table (recommended).
- Option B: continue batched searches and append remaining matches until you confirm the full list.

Tell me which option you prefer and I'll proceed. If this summary is good, I can also commit the new file to a branch.
