/** Route and menu regression for personal schedules (UC49–UC52). */
import { runAccessCheck } from './_role-access-harness.mjs';
await runAccessCheck({uc:'UC49-52',routePath:'/schedule/personal',menuLabel:'Lịch Cá Nhân',allowed:['DOCTOR','LAB','RECEPTIONIST']});
