/**
 * LabUserTracker Component
 * 
 * Component để hiển thị và tracking người thực hiện xét nghiệm
 * Tích hợp lab user profiles vào kết quả xét nghiệm
 */

import React, { useState, useEffect } from 'react';
import { Badge, Card, Row, Col, Form } from 'react-bootstrap';
import testOrderService from '../../services/testOrderService';
import useResponsive from '../../shared/hooks/useResponsive';

// Hook to load and manage lab user profiles
export const useLabUserProfiles = () => {
  const [labUsers, setLabUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadLabUsers();
  }, []);

  const loadLabUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await testOrderService.getAllLabUserProfiles();
      
      if (result.success) {
        setLabUsers(result.data || []);
      } else {
        setError(result.message || 'Failed to load lab users');
        setLabUsers([]);
      }
    } catch (err) {
      setError(err.message);
      setLabUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const getLabUserById = (userId) => {
    return labUsers.find(u => 
      u.id === userId || 
      u.userId === userId ||
      String(u.id) === String(userId) ||
      String(u.userId) === String(userId)
    );
  };

  const getActiveLabUsers = () => {
    return labUsers.filter(u => u.status === 'Active' || !u.status);
  };

  return {
    labUsers,
    loading,
    error,
    getLabUserById,
    getActiveLabUsers,
    reload: loadLabUsers
  };
};

// Lab User Info Display Component
export const LabUserInfo = ({ userId, labUsers }) => {
  const labUser = labUsers?.find(u => 
    u.id === userId || 
    u.userId === userId ||
    String(u.id) === String(userId) ||
    String(u.userId) === String(userId)
  );

  if (!labUser) {
    return <span className="text-muted">N/A</span>;
  }

  return (
    <div className="lab-user-info">
      <div>
        <strong>{labUser.fullName || labUser.name || 'Unknown'}</strong>
        {labUser.specialization && (
          <Badge bg="info" className="ms-2">{labUser.specialization}</Badge>
        )}
      </div>
      {labUser.licenseNumber && (
        <small className="text-muted">
          Giấy phép: {labUser.licenseNumber}
        </small>
      )}
    </div>
  );
};

// Lab User Selector Component
export const LabUserSelector = ({ value, onChange, labUsers, disabled = false }) => {
  const activeUsers = labUsers?.filter(u => u.status === 'Active' || !u.status) || [];

  return (
    <Form.Group>
      <Form.Label>Người thực hiện xét nghiệm:</Form.Label>
      <Form.Select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">-- Chọn người thực hiện --</option>
        {activeUsers.map(user => (
          <option key={user.id || user.userId} value={user.id || user.userId}>
            {user.fullName || user.name}
            {user.specialization && ` - ${user.specialization}`}
          </option>
        ))}
      </Form.Select>
    </Form.Group>
  );
};

// Comprehensive Lab User Card (for result details)
export const LabUserCard = ({ userId, labUsers, performedAt }) => {
  const labUser = labUsers?.find(u => 
    u.id === userId || 
    u.userId === userId ||
    String(u.id) === String(userId) ||
    String(u.userId) === String(userId)
  );

  if (!labUser) {
    return (
      <Card className="mb-3">
        <Card.Body>
          <Card.Title>👤 Người Thực Hiện</Card.Title>
          <p className="text-muted">Không có thông tin</p>
        </Card.Body>
      </Card>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <Card className="mb-3 border-primary">
      <Card.Header className="bg-primary text-white">
        <strong>👤 Thông Tin Người Thực Hiện</strong>
      </Card.Header>
      <Card.Body>
        <Row>
          <Col md={6}>
            <div className="mb-2">
              <small className="text-muted">Họ và tên:</small>
              <div><strong>{labUser.fullName || labUser.name}</strong></div>
            </div>
          </Col>
          <Col md={6}>
            <div className="mb-2">
              <small className="text-muted">Chuyên môn:</small>
              <div>
                {labUser.specialization || 'N/A'}
                {labUser.status && (
                  <Badge 
                    bg={labUser.status === 'Active' ? 'success' : 'secondary'} 
                    className="ms-2"
                  >
                    {labUser.status}
                  </Badge>
                )}
              </div>
            </div>
          </Col>
        </Row>

        <Row>
          <Col md={6}>
            <div className="mb-2">
              <small className="text-muted">Giấy phép hành nghề:</small>
              <div>{labUser.licenseNumber || 'N/A'}</div>
            </div>
          </Col>
          <Col md={6}>
            <div className="mb-2">
              <small className="text-muted">Kinh nghiệm:</small>
              <div>
                {labUser.yearsOfExperience 
                  ? `${labUser.yearsOfExperience} năm` 
                  : 'N/A'}
              </div>
            </div>
          </Col>
        </Row>

        <Row>
          <Col md={6}>
            <div className="mb-2">
              <small className="text-muted">Email:</small>
              <div>{labUser.email || 'N/A'}</div>
            </div>
          </Col>
          <Col md={6}>
            <div className="mb-2">
              <small className="text-muted">Số điện thoại:</small>
              <div>{labUser.phone || 'N/A'}</div>
            </div>
          </Col>
        </Row>

        {performedAt && (
          <Row>
            <Col>
              <div className="mb-2">
                <small className="text-muted">Thời gian thực hiện:</small>
                <div><strong>{formatDate(performedAt)}</strong></div>
              </div>
            </Col>
          </Row>
        )}
      </Card.Body>
    </Card>
  );
};

// Simple Badge Display for Table
export const LabUserBadge = ({ userId, labUsers }) => {
  const labUser = labUsers?.find(u => 
    u.id === userId || 
    u.userId === userId ||
    String(u.id) === String(userId) ||
    String(u.userId) === String(userId)
  );

  if (!labUser) {
    return <Badge bg="secondary">N/A</Badge>;
  }

  return (
    <Badge bg="primary" title={`Giấy phép: ${labUser.licenseNumber || 'N/A'}`}>
      👤 {labUser.fullName || labUser.name}
    </Badge>
  );
};

// Helper: Prepare test result payload with lab user tracking
export const prepareTestResultPayloadWithLabUser = (testData, userId, userName) => {
  return {
    ...testData,
    performedBy: userId,
    performedByName: userName,
    performedAt: new Date().toISOString(),
    technicianId: userId,
    technicianName: userName
  };
};

// Default lab user profile structure (for reference)
export const DEFAULT_LAB_USER_PROFILE = {
  id: null,
  userId: null,
  fullName: '',
  email: '',
  phone: '',
  specialization: '',
  licenseNumber: '',
  yearsOfExperience: 0,
  status: 'Active', // 'Active', 'Inactive', 'Suspended'
  certifications: [],
  joinDate: null
};

export default {
  useLabUserProfiles,
  LabUserInfo,
  LabUserSelector,
  LabUserCard,
  LabUserBadge,
  prepareTestResultPayloadWithLabUser
};

// =====================================================
// INTEGRATION INSTRUCTIONS
// =====================================================

/**
 * How to integrate Lab User Tracking into ResultsDashboardPage.jsx:
 * 
 * 1. Import the hook and components:
 *    import { 
 *      useLabUserProfiles,
 *      LabUserCard,
 *      LabUserBadge,
 *      prepareTestResultPayloadWithLabUser
 *    } from './LabUserTracker';
 * 
 * 2. Use the hook in your component:
 *    const { labUsers, loading: loadingLabUsers, getLabUserById } = useLabUserProfiles();
 * 
 * 3. Add Lab User Card to modal (show who performed the test):
 *    <Modal show={showModal} onHide={() => setShowModal(false)} size="xl">
 *      <Modal.Body>
 *        {selectedTest && selectedTest.performedBy && (
 *          <LabUserCard
 *            userId={selectedTest.performedBy}
 *            labUsers={labUsers}
 *            performedAt={selectedTest.performedAt}
 *          />
 *        )}
 *        
 *        {/* Rest of modal content *\/}
 *      </Modal.Body>
 *    </Modal>
 * 
 * 4. Add Lab User Badge to table:
 *    <Table>
 *      <tbody>
 *        {labTests.map(test => (
 *          <tr key={test.id}>
 *            <td>{test.patientName}</td>
 *            <td>{test.testType}</td>
 *            <td>
 *              <LabUserBadge userId={test.performedBy} labUsers={labUsers} />
 *            </td>
 *          </tr>
 *        ))}
 *      </tbody>
 *    </Table>
 * 
 * 5. Update handleSaveResults to include lab user info:
 *    const handleSaveResults = async () => {
 *      const testResultPayload = prepareTestResultPayloadWithLabUser(
 *        {
 *          appointmentId: selectedTest.appointmentId,
 *          sampleId: selectedTest.sampleId,
 *          parameters: selectedTestParams,
 *          status: 'Pending'
 *        },
 *        user.id,
 *        user.fullName || user.name
 *      );
 *      
 *      const result = await testOrderService.createTestResult(testResultPayload);
 *      // ... rest of save logic
 *    };
 */

// =====================================================
// EXAMPLE LAB USER PROFILE DATA
// =====================================================

/**
 * Example lab user profile:
 * {
 *   id: 'lab-user-1',
 *   userId: 'user-123',
 *   fullName: 'Nguyễn Văn An',
 *   email: 'nguyenvanan@hospital.com',
 *   phone: '0123456789',
 *   specialization: 'Hematology',
 *   licenseNumber: 'LAB-HN-12345',
 *   yearsOfExperience: 8,
 *   status: 'Active',
 *   certifications: [
 *     'Clinical Laboratory Technician',
 *     'Blood Bank Specialist'
 *   ],
 *   joinDate: '2016-03-15'
 * }
 */

// =====================================================
// STYLING (Optional - add to your CSS file)
// =====================================================

/**
 * .lab-user-info {
 *   padding: 0.5rem;
 * }
 * 
 * .lab-user-info strong {
 *   color: #0d6efd;
 * }
 * 
 * .lab-user-badge {
 *   cursor: help;
 * }
 */
