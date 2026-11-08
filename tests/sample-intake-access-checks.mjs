/** UC73: only Lab may receive specimens, consistent with the queue/status API. */
import { runAccessCheck } from './_role-access-harness.mjs';
await runAccessCheck({uc:'UC73',routePath:'/laboratory/checkinsample',menuLabel:'Tiếp Nhận Ống Mẫu Máu',allowed:['LAB']});
