/**
 * Shift Assignment Component - Simplified Version
 * 
 * CRUD cơ bản cho phân bổ ca làm việc:
 * - Hiển thị lịch 1 tháng
 * - Khi chọn ngày, quản lý có thể chọn bác sĩ, lab user, ca, phòng
 * - Tận dụng các service đã có trong dự án
 * 
 * @author Blood Laboratory Management Team
 * @version 3.0.0 (Simplified)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Modal, Form, Badge, Alert } from 'react-bootstrap';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import '../../../../shared/styles/calendar-custom.css';
import { useNotificationContext } from '../../../../shared/contexts/NotificationContext';
import { shiftService } from '../../../../services/shiftService';
import { doctorService } from '../../../../services/doctorService';
import { testOrderService } from '../../../../services/testOrderService';
import ConfirmDialog from '../../../../shared/components/ConfirmDialog/ConfirmDialog';

const ShiftAssignment = () => {
  const { showSuccess, showError } = useNotificationContext();
  
  // State
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [labUsers, setLabUsers] = useState([]);
  const [doctorRooms, setDoctorRooms] = useState([]);
  const [labRooms, setLabRooms] = useState([]);
  const [labAssignments, setLabAssignments] = useState([]);
  
  // Calendar state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Modal state
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [shiftFormData, setShiftFormData] = useState({
    doctorId: '',
    labUserId: '',
    shiftType: 'morning', // morning, afternoon, evening
    doctorRoomId: '', // Phòng cho bác sĩ
    labRoomId: '' // Phòng cho lab user
  });
  
  // Delete confirmation
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [shiftToDelete, setShiftToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Ca làm việc định nghĩa sẵn
  const shiftTypes = {
    morning: { name: 'Ca sáng', startTime: '07:00', endTime: '11:00' },
    afternoon: { name: 'Ca chiều', startTime: '13:00', endTime: '17:00' },
    evening: { name: 'Ca tối', startTime: '18:00', endTime: '21:00' }
  };

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [shiftsResult, doctorsResult, labUsersResult, doctorRoomsResult, labRoomsResult, labAssignmentsResult] = await Promise.all([
        shiftService.getAllShifts(),
        doctorService.getAllDoctors({ page: 1, pageSize: 1000 }),
        testOrderService.getAllLabUserProfiles(), // Lấy Lab Users từ endpoint riêng
        testOrderService.getAllDoctorRooms(), // Lấy phòng bác sĩ
        testOrderService.getAllLabRooms(), // Lấy phòng lab
        shiftService.getAllLabAssignments()
      ]);

      // Load shifts
      if (shiftsResult.success) {
        const shiftsData = shiftsResult.data || [];
        const mappedShifts = shiftsData.map(shift => ({
          ...shift,
          ShiftId: shift.ShiftId || shift.shiftId || shift.id,
          shiftDate: normalizeDate(shift.ShiftDate || shift.shiftDate || shift.shift_date),
          startTime: shift.ShiftStart || shift.shiftStart || shift.shift_start,
          endTime: shift.ShiftEnd || shift.shiftEnd || shift.shift_end,
          doctorId: shift.DoctorId || shift.doctorId || shift.doctor_id,
          roomId: shift.RoomId || shift.roomId || shift.room_id
        }));
        
        // Merge với state hiện tại để giữ lại các shifts mới tạo chưa có trong backend
        setShifts(prev => {
          const existingIds = new Set(mappedShifts.map(s => {
            const id = s.ShiftId || s.shiftId || s.id;
            return id ? String(id) : null;
          }).filter(Boolean));
          
          // Giữ lại các shifts trong state hiện tại mà chưa có trong response mới
          const newShifts = prev.filter(s => {
            const id = s.ShiftId || s.shiftId || s.id;
            if (!id) return false;
            return !existingIds.has(String(id));
          });
          
          // Merge: data mới từ backend + các shifts mới tạo chưa có trong backend
          const merged = [...mappedShifts, ...newShifts];
          return merged;
        });
      }

      // Load doctors
      if (doctorsResult.success) {
        setDoctors(doctorsResult.data || []);
      }

      // Load Lab Users từ endpoint riêng (không cần admin quyền)
      if (labUsersResult.success) {
        const labUsersData = labUsersResult.data || [];
        // Convert LabUserProfile format thành format tương thích
        setLabUsers(labUsersData.map(labUser => ({
          id: labUser.UserId || labUser.userId || labUser.id,
          userId: labUser.UserId || labUser.userId || labUser.id,
          fullName: labUser.FullName || labUser.fullName || labUser.name,
          FullName: labUser.FullName || labUser.fullName,
          roleId: 4, // Labuser role
          roleName: 'Labuser',
          role: 'labuser'
        })));
        
      } else {
        setLabUsers([]);
      }

      // Load Doctor Rooms
      if (doctorRoomsResult.success) {
        setDoctorRooms(doctorRoomsResult.data || []);
      } else {
        setDoctorRooms([]);
      }

      // Load Lab Rooms
      if (labRoomsResult.success) {
        setLabRooms(labRoomsResult.data || []);
      } else {
        setLabRooms([]);
      }

      // Load lab assignments
      if (labAssignmentsResult.success) {
        const assignmentsData = labAssignmentsResult.data || [];
        const mappedAssignments = assignmentsData.map(assignment => {
          const rawDate = assignment.AssignmentDate || assignment.assignmentDate || assignment.assignment_date;
          const normalizedDate = normalizeDate(rawDate);
          return {
            ...assignment,
            AssignmentId: assignment.AssignmentId || assignment.assignmentId || assignment.id,
            assignmentDate: normalizedDate,
            shiftStart: assignment.ShiftStart || assignment.shiftStart || assignment.shift_start,
            shiftEnd: assignment.ShiftEnd || assignment.shiftEnd || assignment.shift_end,
            labUserId: assignment.LabUserId || assignment.labUserId || assignment.lab_user_id,
            labRoomId: assignment.LabRoomId || assignment.labRoomId || assignment.lab_room_id
          };
        });
        
        // Merge với state hiện tại để giữ lại các lab assignments mới tạo chưa có trong backend
        setLabAssignments(prev => {
          const existingIds = new Set(mappedAssignments.map(la => {
            const id = la.AssignmentId || la.assignmentId || la.id;
            return id ? String(id) : null;
          }).filter(Boolean));
          
          // Giữ lại các lab assignments trong state hiện tại mà chưa có trong response mới
          // (có thể là những cái vừa tạo nhưng backend chưa trả về)
          const newAssignments = prev.filter(la => {
            const id = la.AssignmentId || la.assignmentId || la.id;
            if (!id) return false;
            return !existingIds.has(String(id));
          });
          
          // Merge: data mới từ backend + các lab assignments mới tạo chưa có trong backend
          const merged = [...mappedAssignments, ...newAssignments];
          return merged;
        });
      } else {
        // Không xóa state nếu load thất bại, giữ lại data hiện tại
      }
    } catch (error) {
      showError('Lỗi khi tải dữ liệu: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Helper: Normalize date to YYYY-MM-DD
  const normalizeDate = (dateValue) => {
    if (!dateValue) return null;
    try {
      if (typeof dateValue === 'string') {
        const dateStr = dateValue.split('T')[0];
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
        const parsed = new Date(dateValue);
        if (!isNaN(parsed.getTime())) {
          const y = parsed.getFullYear();
          const m = String(parsed.getMonth() + 1).padStart(2, '0');
          const d = String(parsed.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;
        }
      }
      if (dateValue instanceof Date) {
        const y = dateValue.getFullYear();
        const m = String(dateValue.getMonth() + 1).padStart(2, '0');
        const d = String(dateValue.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    } catch (e) {
      return null;
    }
    return null;
  };

  // Get shifts for a specific date (including lab assignments)
  const getShiftsForDate = (date) => {
    const dateStr = normalizeDate(date);
    if (!dateStr) return [];
    
    // Get doctor shifts
    const doctorShifts = shifts
      .filter(shift => shift.shiftDate === dateStr)
      .map(shift => ({
        ...shift,
        type: 'doctor_shift' // Đánh dấu rõ ràng là doctor shift
      }));
    
    // Get lab assignments and convert to shift-like format
    const labShifts = labAssignments
      .filter(la => {
        const assignmentDate = la.assignmentDate || normalizeDate(la.AssignmentDate || la.assignmentDate || la.assignment_date);
        return assignmentDate === dateStr;
      })
      .map(la => ({
        ...la,
        id: la.AssignmentId || la.assignmentId || la.id,
        type: 'lab_assignment', // Đánh dấu rõ ràng là lab assignment
        labUserId: la.labUserId || la.LabUserId,
        startTime: la.shiftStart || la.ShiftStart || la.shift_start,
        endTime: la.shiftEnd || la.ShiftEnd || la.shift_end,
        roomId: la.labRoomId || la.LabRoomId,
        labRoomId: la.labRoomId || la.LabRoomId
      }));
    
    return [...doctorShifts, ...labShifts];
  };

  // Check if date has shifts
  const dateHasShifts = (date) => {
    return getShiftsForDate(date).length > 0;
  };

  // Handle date click - chỉ cập nhật selectedDate để xem ca làm việc
  const handleDateClick = (date) => {
    setSelectedDate(date);
  };

  // Handle create new shift - mở modal để tạo ca mới
  const handleCreateShift = () => {
    setEditingShift(null);
    setShiftFormData({
      doctorId: '',
      labUserId: '',
      shiftType: 'morning',
      doctorRoomId: '',
      labRoomId: ''
    });
    setShowShiftModal(true);
  };

  // Handle edit shift
  const handleEditShift = (shift) => {
    setEditingShift(shift);
    
    // Determine shift type from time
    let shiftType = 'morning';
    const startTime = shift.startTime || '';
    if (startTime.includes('13:') || startTime.includes('14:') || startTime.includes('15:')) {
      shiftType = 'afternoon';
    } else if (startTime.includes('18:') || startTime.includes('19:') || startTime.includes('20:')) {
      shiftType = 'evening';
    }
    
    // Nếu là lab assignment, chỉ load thông tin lab assignment (KHÔNG load doctor shift)
    if (shift.type === 'lab_assignment') {
      setShiftFormData({
        doctorId: '', // Không có bác sĩ cho lab assignment
        labUserId: shift.labUserId || '',
        shiftType: shiftType,
        doctorRoomId: '', // Không có phòng bác sĩ
        labRoomId: shift.roomId || shift.labRoomId || ''
      });
    } else {
      // Nếu là doctor shift, có thể có lab user cùng ca (tùy chọn)
      // CHỈ load lab assignment nếu người dùng muốn quản lý cùng lúc
      // Nhưng để đơn giản, ta chỉ load thông tin doctor shift
      const shiftDateStr = normalizeDate(shift.shiftDate);
      const relatedLabAssignments = labAssignments.filter(la => 
        la.assignmentDate === shiftDateStr && 
        la.shiftStart === shift.startTime
      );
      
      // Tìm lab user assignment đầu tiên (nếu có nhiều, chỉ lấy 1)
      const labUserAssignment = relatedLabAssignments.length > 0 ? relatedLabAssignments[0] : null;
      
      setShiftFormData({
        doctorId: shift.doctorId || shift.DoctorId || '',
        labUserId: labUserAssignment?.labUserId || '', // Tùy chọn - có thể có hoặc không
        shiftType: shiftType,
        doctorRoomId: shift.roomId || shift.RoomId || '',
        labRoomId: labUserAssignment?.labRoomId || ''
      });
    }
    
    const shiftDate = new Date(shift.shiftDate || shift.assignmentDate);
    setSelectedDate(shiftDate);
    setShowShiftModal(true);
  };

  // Handle save shift
  const handleSaveShift = async (e) => {
    e.preventDefault();
    
    try {
      const selectedShiftType = shiftTypes[shiftFormData.shiftType];
      const dateStr = normalizeDate(selectedDate);
      
      if (!dateStr) {
        showError('Vui lòng chọn ngày hợp lệ');
        return;
      }

      // Nếu đang edit lab assignment (không có doctor), chỉ xử lý lab assignment
      if (editingShift && editingShift.type === 'lab_assignment') {
        // Chỉ update lab assignment, không tạo doctor shift
        const assignmentId = editingShift.AssignmentId || editingShift.assignmentId || editingShift.id;
        const labAssignmentData = {
          LabUserId: shiftFormData.labUserId,
          AssignmentDate: dateStr,
          ShiftStart: selectedShiftType.startTime,
          ShiftEnd: selectedShiftType.endTime,
          Status: 'Scheduled',
          LabRoomId: shiftFormData.labRoomId || null
        };
        
        const result = await shiftService.updateLabAssignment(assignmentId, labAssignmentData);
        if (result.success) {
          showSuccess('Cập nhật phân công Lab thành công');
          setShowShiftModal(false);
          loadData();
        } else {
          showError(result.message || 'Lỗi khi cập nhật phân công Lab');
        }
        return;
      }

      // Nếu không có bác sĩ và không có lab user, báo lỗi
      if (!shiftFormData.doctorId && !shiftFormData.labUserId) {
        showError('Vui lòng chọn ít nhất bác sĩ hoặc nhân viên Lab');
        return;
      }

      // Tạo/Update doctor shift nếu có bác sĩ
      let doctorShiftResult = { success: true };
      if (shiftFormData.doctorId) {
        const shiftData = {
          DoctorId: shiftFormData.doctorId,
          ShiftDate: dateStr,
          ShiftStart: selectedShiftType.startTime,
          ShiftEnd: selectedShiftType.endTime,
          Status: 'Scheduled',
          RoomId: shiftFormData.doctorRoomId || null
        };

        if (editingShift && !editingShift.type) {
          // Update existing doctor shift
          const shiftId = editingShift.ShiftId || editingShift.shiftId || editingShift.id;
          doctorShiftResult = await shiftService.updateShift(shiftId, shiftData);
        } else if (!editingShift) {
          // Create new doctor shift
          doctorShiftResult = await shiftService.createShift(shiftData);
        }
      }

      // Xử lý Lab Assignments - tạo độc lập với doctor shift
      let labAssignmentResult = { success: true };
      if (shiftFormData.labUserId) {
        const labAssignmentData = {
          LabUserId: shiftFormData.labUserId,
          AssignmentDate: dateStr,
          ShiftStart: selectedShiftType.startTime,
          ShiftEnd: selectedShiftType.endTime,
          Status: 'Scheduled',
          LabRoomId: shiftFormData.labRoomId || null
        };
        
        
        if (editingShift && editingShift.type === 'lab_assignment') {
          // Update existing lab assignment
          const assignmentId = editingShift.AssignmentId || editingShift.assignmentId || editingShift.id;
          labAssignmentResult = await shiftService.updateLabAssignment(assignmentId, labAssignmentData);
        } else if (editingShift && !editingShift.type) {
          // Nếu đang edit doctor shift, tìm và xử lý lab assignments cũ
          const shiftDateStr = normalizeDate(editingShift.shiftDate);
          const oldLabAssignments = labAssignments.filter(la => 
            la.assignmentDate === shiftDateStr && 
            la.shiftStart === editingShift.startTime
          );
          
          // Xóa lab assignments cũ không còn được chọn
          for (const oldAssignment of oldLabAssignments) {
            const oldLabUserId = oldAssignment.labUserId;
            const isStillSelected = 
              (shiftFormData.labUserId && String(oldLabUserId) === String(shiftFormData.labUserId));
            
            if (!isStillSelected) {
              const assignmentId = oldAssignment.AssignmentId || oldAssignment.assignmentId || oldAssignment.id;
              const deleteResult = await shiftService.deleteLabAssignment(assignmentId);
              if (deleteResult.success) {
                setLabAssignments(prev => prev.filter(la => {
                  const laId = la.AssignmentId || la.assignmentId || la.id;
                  return !(laId && String(laId) === String(assignmentId));
                }));
              }
            }
          }
          
          // Tìm lab assignment cũ cho lab user này
          const existingLabAssignment = labAssignments.find(la => 
            la.assignmentDate === shiftDateStr && 
            la.shiftStart === editingShift.startTime &&
            String(la.labUserId) === String(shiftFormData.labUserId)
          );
          
          if (existingLabAssignment) {
            const assignmentId = existingLabAssignment.AssignmentId || existingLabAssignment.assignmentId || existingLabAssignment.id;
            labAssignmentResult = await shiftService.updateLabAssignment(assignmentId, labAssignmentData);
          } else {
            labAssignmentResult = await shiftService.createLabAssignment(labAssignmentData);
          }
        } else {
          // Create new lab assignment
          labAssignmentResult = await shiftService.createLabAssignment(labAssignmentData);
        }
      } else if (editingShift && !editingShift.type) {
        // Nếu đang edit doctor shift và không chọn lab user, xóa lab assignments cũ
        const shiftDateStr = normalizeDate(editingShift.shiftDate);
        const oldLabAssignments = labAssignments.filter(la => 
          la.assignmentDate === shiftDateStr && 
          la.shiftStart === editingShift.startTime
        );
        
        for (const oldAssignment of oldLabAssignments) {
          const assignmentId = oldAssignment.AssignmentId || oldAssignment.assignmentId || oldAssignment.id;
          const deleteResult = await shiftService.deleteLabAssignment(assignmentId);
          if (deleteResult.success) {
            setLabAssignments(prev => prev.filter(la => {
              const laId = la.AssignmentId || la.assignmentId || la.id;
              return !(laId && String(laId) === String(assignmentId));
            }));
          }
        }
      }
      
      // Kiểm tra kết quả và hiển thị thông báo
      // Nếu không có doctor, chỉ cần lab assignment success
      // Nếu không có lab user, chỉ cần doctor shift success
      // Nếu có cả hai, cả hai đều phải success
      const doctorSuccess = !shiftFormData.doctorId || doctorShiftResult.success;
      const labSuccess = !shiftFormData.labUserId || labAssignmentResult.success;
      
      // Xử lý lab assignment state update - làm riêng biệt để đảm bảo nó được update ngay cả khi doctor shift thất bại
      if (shiftFormData.labUserId && labAssignmentResult.success && labAssignmentResult.data) {
        const labAssignmentData = labAssignmentResult.data;
        const normalizedDate = normalizeDate(labAssignmentData.AssignmentDate || labAssignmentData.assignmentDate || labAssignmentData.assignment_date);
        const mappedAssignment = {
          ...labAssignmentData,
          AssignmentId: labAssignmentData.AssignmentId || labAssignmentData.assignmentId || labAssignmentData.id,
          assignmentDate: normalizedDate,
          shiftStart: labAssignmentData.ShiftStart || labAssignmentData.shiftStart || labAssignmentData.shift_start,
          shiftEnd: labAssignmentData.ShiftEnd || labAssignmentData.shiftEnd || labAssignmentData.shift_end,
          labUserId: labAssignmentData.LabUserId || labAssignmentData.labUserId || labAssignmentData.lab_user_id,
          labRoomId: labAssignmentData.LabRoomId || labAssignmentData.labRoomId || labAssignmentData.lab_room_id
        };
        
        // Kiểm tra xem có AssignmentId không (dấu hiệu thành công)
        if (!mappedAssignment.AssignmentId && !mappedAssignment.assignmentId && !mappedAssignment.id) {
        } else {
          const isUpdate = editingShift && (editingShift.type === 'lab_assignment' || (!editingShift.type && labAssignments.some(la => {
            const laId = la.AssignmentId || la.assignmentId || la.id;
            const newId = mappedAssignment.AssignmentId || mappedAssignment.assignmentId || mappedAssignment.id;
            return laId && newId && String(laId) === String(newId);
          })));
          
          setLabAssignments(prev => {
            // Kiểm tra xem đã có chưa để update hoặc thêm mới
            const exists = prev.some(la => {
              const laId = la.AssignmentId || la.assignmentId || la.id;
              const newId = mappedAssignment.AssignmentId || mappedAssignment.assignmentId || mappedAssignment.id;
              return laId && newId && String(laId) === String(newId);
            });
            if (exists) {
              return prev.map(la => {
                const laId = la.AssignmentId || la.assignmentId || la.id;
                const newId = mappedAssignment.AssignmentId || mappedAssignment.assignmentId || mappedAssignment.id;
                if (laId && newId && String(laId) === String(newId)) {
                  return mappedAssignment;
                }
                return la;
              });
            }
            const updated = [...prev, mappedAssignment];
            return updated;
          });
        }
      }
      
      if (doctorSuccess && labSuccess) {
        
        // Nếu doctor shift được tạo thành công, thêm vào state ngay lập tức
        if (shiftFormData.doctorId && doctorShiftResult.success && doctorShiftResult.data) {
          const newShift = doctorShiftResult.data;
          const normalizedDate = normalizeDate(newShift.ShiftDate || newShift.shiftDate || newShift.shift_date);
          const mappedShift = {
            ...newShift,
            shiftDate: normalizedDate,
            startTime: newShift.ShiftStart || newShift.shiftStart || newShift.shift_start,
            endTime: newShift.ShiftEnd || newShift.shiftEnd || newShift.shift_end,
            doctorId: newShift.DoctorId || newShift.doctorId || newShift.doctor_id,
            roomId: newShift.RoomId || newShift.roomId || newShift.room_id
          };
          
          setShifts(prev => {
            // Kiểm tra xem đã có chưa để tránh duplicate
            const exists = prev.some(s => {
              const sId = s.ShiftId || s.shiftId || s.id;
              const newId = mappedShift.ShiftId || mappedShift.shiftId || mappedShift.id;
              return sId && newId && String(sId) === String(newId);
            });
            if (exists) {
              return prev.map(s => {
                const sId = s.ShiftId || s.shiftId || s.id;
                const newId = mappedShift.ShiftId || mappedShift.shiftId || mappedShift.id;
                if (sId && newId && String(sId) === String(newId)) {
                  return mappedShift;
                }
                return s;
              });
            }
            return [...prev, mappedShift];
          });
        }
        
        const messages = [];
        if (shiftFormData.doctorId && doctorShiftResult.success) {
          messages.push(editingShift ? 'Cập nhật ca làm việc bác sĩ thành công' : 'Tạo ca làm việc bác sĩ thành công');
        }
        if (shiftFormData.labUserId && labAssignmentResult.success) {
          messages.push(editingShift ? 'Cập nhật phân công Lab thành công' : 'Tạo phân công Lab thành công');
        }
        showSuccess(messages.join(' và ') || 'Thao tác thành công');
        setShowShiftModal(false);
        // Vẫn reload để đảm bảo data đồng bộ với backend
        // Tăng delay để đảm bảo backend đã lưu xong
        setTimeout(() => {
          loadData();
        }, 2000);
      } else {
        // Xử lý trường hợp một phần thành công, một phần thất bại
        const successMessages = [];
        const errorMessages = [];
        
        if (shiftFormData.doctorId) {
          if (doctorShiftResult.success) {
            successMessages.push(editingShift ? 'Cập nhật ca làm việc bác sĩ thành công' : 'Tạo ca làm việc bác sĩ thành công');
          } else {
            const errorMsg = doctorShiftResult.message || 'Lỗi khi lưu ca làm việc bác sĩ';
            errorMessages.push(errorMsg);
          }
        }
        
        if (shiftFormData.labUserId) {
          if (labAssignmentResult.success) {
            successMessages.push(editingShift ? 'Cập nhật phân công Lab thành công' : 'Tạo phân công Lab thành công');
          } else {
            const errorMsg = labAssignmentResult.message || 'Lỗi khi lưu phân công Lab';
            errorMessages.push(errorMsg);
          }
        }
        
        // Hiển thị thông báo thành công nếu có
        if (successMessages.length > 0) {
          showSuccess(successMessages.join(' và '));
        }
        
        // Hiển thị thông báo lỗi nếu có
        if (errorMessages.length > 0) {
          showError(errorMessages.join(' và '));
        }
        
        // Nếu có ít nhất một phần thành công, đóng modal và reload
        if (doctorSuccess || labSuccess) {
          setShowShiftModal(false);
          setTimeout(() => {
            loadData();
          }, 1000);
        }
      }
    } catch (error) {
      showError('Lỗi xử lý: ' + error.message);
    }
  };

  // Handle delete shift
  const handleDeleteShift = (shift) => {
    setShiftToDelete(shift);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!shiftToDelete) return;
    
    setIsDeleting(true);
    try {
      // Nếu là lab assignment, xóa lab assignment
      if (shiftToDelete.type === 'lab_assignment') {
        const assignmentId = shiftToDelete.AssignmentId || shiftToDelete.assignmentId || shiftToDelete.id;
        
        if (!assignmentId) {
          showError('Không tìm thấy ID của phân công Lab');
          setIsDeleting(false);
          return;
        }
        
        const result = await shiftService.deleteLabAssignment(assignmentId);
        
        // Kiểm tra xem có phải lỗi 404 không (lab assignment không tồn tại)
        const isNotFound = result.message && result.message.includes('Không tìm thấy');
        
        if (result.success || isNotFound) {
          // Xóa khỏi state ngay lập tức (kể cả khi 404 - có thể đã bị xóa trước đó)
          setLabAssignments(prev => {
            const filtered = prev.filter(la => {
              const laId = la.AssignmentId || la.assignmentId || la.id;
              return !(laId && String(laId) === String(assignmentId));
            });
            return filtered;
          });
          
          if (isNotFound) {
            showSuccess('Phân công Lab đã được xóa khỏi danh sách (không tồn tại trên server)');
          } else {
            showSuccess('Xóa phân công Lab thành công');
          }
          setShowDeleteDialog(false);
          setShiftToDelete(null);
          // Vẫn reload để đảm bảo đồng bộ
          setTimeout(() => {
            loadData();
          }, 500);
        } else {
          showError(result.message || 'Lỗi khi xóa phân công Lab');
        }
      } else {
        // Nếu là doctor shift, xóa doctor shift
        const shiftId = shiftToDelete.ShiftId || shiftToDelete.shiftId || shiftToDelete.id;
        
        if (!shiftId) {
          showError('Không tìm thấy ID của ca làm việc');
          setIsDeleting(false);
          return;
        }
        
        const result = await shiftService.deleteShift(shiftId);
        
        // Kiểm tra xem có phải lỗi 404 không (shift không tồn tại)
        const isNotFound = result.message && result.message.includes('Không tìm thấy');
        
        if (result.success || isNotFound) {
          // Xóa khỏi state ngay lập tức (kể cả khi 404 - có thể đã bị xóa trước đó)
          setShifts(prev => {
            const filtered = prev.filter(s => {
              const sId = s.ShiftId || s.shiftId || s.id;
              return !(sId && String(sId) === String(shiftId));
            });
            return filtered;
          });
          
          if (isNotFound) {
            showSuccess('Ca làm việc đã được xóa khỏi danh sách (không tồn tại trên server)');
          } else {
            showSuccess('Xóa ca làm việc thành công');
          }
          setShowDeleteDialog(false);
          setShiftToDelete(null);
          // Vẫn reload để đảm bảo đồng bộ
          setTimeout(() => {
            loadData();
          }, 500);
        } else {
          showError(result.message || 'Lỗi khi xóa ca làm việc');
        }
      }
    } catch (error) {
      showError('Lỗi xóa: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Get doctor name
  const getDoctorName = (doctorId) => {
    if (!doctorId) return 'Chưa chọn';
    const doctor = doctors.find(d => 
      String(d.DoctorId || d.doctorId || d.id) === String(doctorId)
    );
    return doctor ? (doctor.FullName || doctor.fullName) : 'Không tìm thấy';
  };

  // Get doctor room name
  const getDoctorRoomName = (roomId) => {
    if (!roomId) return 'Chưa chọn';
    const room = doctorRooms.find(r => 
      String(r.RoomId || r.roomId || r.id) === String(roomId)
    );
    return room ? (room.RoomName || room.roomName || room.name) : roomId;
  };

  // Get lab room name
  const getLabRoomName = (roomId) => {
    if (!roomId) return 'Chưa chọn';
    const room = labRooms.find(r => 
      String(r.RoomId || r.roomId || r.id) === String(roomId)
    );
    return room ? (room.RoomName || room.roomName || room.name) : roomId;
  };

  // Get lab user name
  const getLabUserName = (labUserId) => {
    if (!labUserId) return null;
    const labUser = labUsers.find(u => 
      String(u.id || u.userId || u.UserId) === String(labUserId)
    );
    return labUser ? (labUser.fullName || labUser.FullName || labUser.name || labUser.Name) : null;
  };


  // Calendar tile content - highlight dates with shifts (bao gồm cả doctor shifts và lab assignments)
  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dateStr = normalizeDate(date);
      const dateShifts = getShiftsForDate(date); // Sử dụng hàm getShiftsForDate để lấy cả doctor shifts và lab assignments
      if (dateShifts.length > 0) {
        return (
          <div className="d-flex justify-content-center mt-1">
            <Badge bg="primary" pill>{dateShifts.length}</Badge>
          </div>
        );
      }
    }
    return null;
  };

  // Calendar tile className - highlight dates with shifts (bao gồm cả doctor shifts và lab assignments)
  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const dateStr = normalizeDate(date);
      const dateShifts = getShiftsForDate(date); // Sử dụng hàm getShiftsForDate để lấy cả doctor shifts và lab assignments
      if (dateShifts.length > 0) {
        return 'has-shifts';
      }
    }
    return null;
  };


  if (loading) {
    return (
      <Container className="py-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
        </div>
      </Container>
    );
  }

  const selectedDateShifts = getShiftsForDate(selectedDate);

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h2 className="mb-0">
            <i className="fas fa-calendar-alt me-2 text-primary"></i>
            Phân bổ ca làm việc
          </h2>
          <p className="text-muted">Quản lý ca làm việc cho bác sĩ và nhân viên lab</p>
        </Col>
      </Row>

      <Row>
        {/* Calendar */}
        <Col md={5}>
          <Card className="shadow-sm">
        <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">
                <i className="fas fa-calendar me-2"></i>
                Lịch tháng
              </h5>
        </Card.Header>
        <Card.Body>
              <Calendar
                onChange={setCurrentMonth}
                value={currentMonth}
                onClickDay={handleDateClick}
                tileContent={tileContent}
                tileClassName={tileClassName}
                locale="vi"
              />
              <div className="mt-3">
                <small className="text-muted">
                  <i className="fas fa-info-circle me-1"></i>
                  Click vào ngày để xem ca làm việc. Số trên ngày là số ca đã phân bổ.
                </small>
              </div>
              <div className="mt-2">
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={handleCreateShift}
                  className="w-100"
                >
                  <i className="fas fa-plus me-1"></i>
                  Tạo ca làm việc mới cho ngày đã chọn
                </Button>
              </div>
        </Card.Body>
      </Card>
        </Col>

        {/* Shifts for selected date */}
        <Col md={7}>
          <Card className="shadow-sm">
            <Card.Header className="bg-info text-white">
              <h5 className="mb-0">
                <i className="fas fa-clock me-2"></i>
                Ca làm việc ngày {selectedDate.toLocaleDateString('vi-VN')}
              </h5>
            </Card.Header>
            <Card.Body>
              {selectedDateShifts.length > 0 ? (
                <div>
                  {selectedDateShifts.map((shift, index) => {
                    const shiftType = Object.keys(shiftTypes).find(key => {
                      const type = shiftTypes[key];
                      return shift.startTime === type.startTime;
                    });
                    
                    return (
                      <Card key={index} className="mb-3 border-start border-3 border-primary">
                        <Card.Body>
                          <Row className="align-items-center">
                            <Col>
                              <h6 className="mb-1">
                                {shift.type === 'lab_assignment' ? (
                                  <Badge bg="info" className="me-2">
                                    <i className="fas fa-flask me-1"></i>
                                    Phân công Lab
                                  </Badge>
                                ) : (
                                  <Badge bg="primary" className="me-2">
                                    <i className="fas fa-user-md me-1"></i>
                                    Ca làm việc Bác sĩ
                                  </Badge>
                                )}
                                {shiftTypes[shiftType]?.name || 'Ca làm việc'}
                              </h6>
                              <p className="mb-1">
                                {shift.doctorId && (
                                  <>
                                    <strong>Bác sĩ:</strong> {getDoctorName(shift.doctorId)}
                                    <br />
                                  </>
                                )}
                                {(shift.type === 'lab_assignment' || shift.labUserId) && (
                                  <>
                                    <strong>Nhân viên Lab:</strong> {getLabUserName(shift.labUserId || shift.LabUserId) || 'N/A'}
                                    <br />
                                  </>
                                )}
                                <strong>Giờ:</strong> {shift.startTime || shift.ShiftStart || shift.shiftStart} - {shift.endTime || shift.ShiftEnd || shift.shiftEnd}
                                <br />
                                {shift.doctorId && shift.roomId && (
                                  <>
                                    <strong>Phòng bác sĩ:</strong> {getDoctorRoomName(shift.roomId)}
                                    <br />
                                  </>
                                )}
                                {(shift.type === 'lab_assignment' || shift.labRoomId) && (shift.roomId || shift.labRoomId) && (
                                  <>
                                    <strong>Phòng lab:</strong> {getLabRoomName(shift.roomId || shift.labRoomId)}
                                    <br />
                                  </>
                                )}
                              </p>
                            </Col>
                            <Col xs="auto">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="me-2"
                            onClick={() => handleEditShift(shift)}
                          >
                            <i className="fas fa-edit"></i>
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                                onClick={() => handleDeleteShift(shift)}
                          >
                            <i className="fas fa-trash"></i>
                          </Button>
                            </Col>
                          </Row>
            </Card.Body>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Alert variant="info" className="text-center">
                  <i className="fas fa-info-circle fa-2x mb-2"></i>
                  <p>Chưa có ca làm việc nào cho ngày này</p>
                  <Button variant="primary" onClick={handleCreateShift}>
                    <i className="fas fa-plus me-1"></i>
                    Tạo ca làm việc
                  </Button>
                </Alert>
              )}
            </Card.Body>
      </Card>
        </Col>
      </Row>

      {/* Modal: Create/Edit Shift */}
      <Modal show={showShiftModal} onHide={() => setShowShiftModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-clock me-2"></i>
            {editingShift 
              ? (editingShift.type === 'lab_assignment' 
                  ? 'Chỉnh sửa phân công Lab' 
                  : 'Chỉnh sửa ca làm việc bác sĩ')
              : 'Tạo ca làm việc mới'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSaveShift}>
          <Modal.Body>
            <Alert variant="info">
              <strong>Ngày:</strong> {selectedDate.toLocaleDateString('vi-VN')}
              {editingShift && (
                <>
                  <br />
                  <strong>Loại:</strong> {editingShift.type === 'lab_assignment' 
                    ? <Badge bg="info">Phân công Lab</Badge> 
                    : <Badge bg="primary">Ca làm việc Bác sĩ</Badge>}
                </>
              )}
            </Alert>

            {/* Chỉ hiển thị field bác sĩ nếu không phải đang edit lab assignment */}
            {(!editingShift || editingShift.type !== 'lab_assignment') && (
              <Form.Group className="mb-3">
                <Form.Label>
                  <i className="fas fa-user-md me-1"></i>
                  Bác sĩ *
                </Form.Label>
                <Form.Select
                  value={shiftFormData.doctorId}
                  onChange={(e) => setShiftFormData({...shiftFormData, doctorId: e.target.value})}
                  required={!editingShift || editingShift.type !== 'lab_assignment'}
                >
                  <option value="">-- Chọn bác sĩ --</option>
                  {doctors.map((doctor) => (
                    <option 
                      key={doctor.DoctorId || doctor.doctorId || doctor.id} 
                      value={doctor.DoctorId || doctor.doctorId || doctor.id}
                    >
                      {doctor.FullName || doctor.fullName} 
                      {doctor.Specialization && ` - ${doctor.Specialization || doctor.specialization}`}
                    </option>
                  ))}
                </Form.Select>
                {editingShift && editingShift.type !== 'lab_assignment' && (
                  <Form.Text className="text-muted">
                    <i className="fas fa-info-circle me-1"></i>
                    Đang chỉnh sửa ca làm việc của bác sĩ này
                  </Form.Text>
                )}
              </Form.Group>
            )}

                  <Form.Group className="mb-3">
              <Form.Label>Ca làm việc *</Form.Label>
                    <Form.Select
                value={shiftFormData.shiftType}
                onChange={(e) => setShiftFormData({...shiftFormData, shiftType: e.target.value})}
                required
              >
                {Object.keys(shiftTypes).map((key) => {
                  const type = shiftTypes[key];
                        return (
                    <option key={key} value={key}>
                      {type.name} ({type.startTime} - {type.endTime})
                    </option>
                  );
                })}
              </Form.Select>
                  </Form.Group>

            {/* Luôn hiển thị field lab user khi tạo mới hoặc edit lab assignment, hoặc khi không có bác sĩ, hoặc khi edit doctor shift (để có thể thêm/sửa lab assignment) */}
            {(!editingShift || editingShift.type === 'lab_assignment' || !shiftFormData.doctorId || (editingShift && !editingShift.type)) && (
              <Form.Group className="mb-3">
                <Form.Label>
                  <i className="fas fa-flask me-1"></i>
                  Nhân viên Lab {editingShift && editingShift.type === 'lab_assignment' ? '*' : ''}
                </Form.Label>
                <Form.Select
                  value={shiftFormData.labUserId}
                  onChange={(e) => setShiftFormData({...shiftFormData, labUserId: e.target.value})}
                  required={editingShift && editingShift.type === 'lab_assignment'}
                >
                  <option value="">-- Chọn nhân viên Lab {editingShift && editingShift.type === 'lab_assignment' ? '' : '(tùy chọn)'} --</option>
                  {labUsers.map((labUser) => (
                    <option 
                      key={labUser.id || labUser.userId || labUser.UserId} 
                      value={labUser.id || labUser.userId || labUser.UserId}
                    >
                      {labUser.fullName || labUser.FullName || labUser.name || labUser.Name}
                    </option>
                  ))}
                </Form.Select>
                {editingShift && editingShift.type === 'lab_assignment' ? (
                  <Form.Text className="text-muted">
                    <i className="fas fa-info-circle me-1"></i>
                    Đang chỉnh sửa phân công Lab này
                  </Form.Text>
                ) : (
                  <Form.Text className="text-muted">
                    <i className="fas fa-info-circle me-1"></i>
                    Nhân viên Lab sẽ được tạo Lab Assignment riêng biệt (có thể tạo cùng hoặc không cùng với ca bác sĩ)
                  </Form.Text>
                )}
              </Form.Group>
            )}

            {/* Chỉ hiển thị phòng bác sĩ nếu có bác sĩ và không phải đang edit lab assignment */}
            {(!editingShift || editingShift.type !== 'lab_assignment') && shiftFormData.doctorId && (
              <Form.Group className="mb-3">
                <Form.Label>
                  <i className="fas fa-door-open me-1"></i>
                  Phòng bác sĩ
                </Form.Label>
                <Form.Select
                  value={shiftFormData.doctorRoomId}
                  onChange={(e) => setShiftFormData({...shiftFormData, doctorRoomId: e.target.value})}
                >
                  <option value="">-- Chọn phòng bác sĩ (tùy chọn) --</option>
                  {doctorRooms.map((room) => (
                    <option 
                      key={room.RoomId || room.roomId || room.id} 
                      value={room.RoomId || room.roomId || room.id}
                    >
                      {room.RoomName || room.roomName || room.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            )}

            {/* Chỉ hiển thị phòng lab nếu có lab user */}
            {shiftFormData.labUserId && (
              <Form.Group className="mb-3">
                <Form.Label>
                  <i className="fas fa-door-open me-1"></i>
                  Phòng lab
                </Form.Label>
                <Form.Select
                  value={shiftFormData.labRoomId}
                  onChange={(e) => setShiftFormData({...shiftFormData, labRoomId: e.target.value})}
                >
                  <option value="">-- Chọn phòng lab (tùy chọn) --</option>
                  {labRooms.map((room) => (
                    <option 
                      key={room.RoomId || room.roomId || room.id} 
                      value={room.RoomId || room.roomId || room.id}
                    >
                      {room.RoomName || room.roomName || room.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            )}
        </Modal.Body>
        <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowShiftModal(false)}>
            Hủy
          </Button>
            <Button variant="primary" type="submit">
              <i className="fas fa-save me-2"></i>
              {editingShift ? 'Cập nhật' : 'Tạo mới'}
          </Button>
        </Modal.Footer>
        </Form>
      </Modal>

       {/* Delete Confirmation Dialog */}
       <ConfirmDialog
         show={showDeleteDialog}
         onHide={() => {
           setShowDeleteDialog(false);
           setShiftToDelete(null);
         }}
         onConfirm={confirmDelete}
         title="Xác nhận xóa ca làm việc"
         message="Bạn có chắc chắn muốn xóa ca làm việc này? Hành động này không thể hoàn tác."
         confirmText="Xóa"
         cancelText="Hủy"
         variant="danger"
         isLoading={isDeleting}
       />

     </Container>
   );
 };
 
 export default ShiftAssignment;
